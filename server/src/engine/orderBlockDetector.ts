import { Candle, OrderBlock, OrderBlockStatus, OrderBlockType, Timeframe } from '../types/index.js';

interface SwingPoint {
  index: number;
  type: 'HIGH' | 'LOW';
  price: number;
  date: string;
}

/**
 * Detects swing highs and swing lows (Fractals / 2 to 3 bar pivots)
 */
function findSwingPoints(candles: Candle[], lookback: number = 2): SwingPoint[] {
  const swings: SwingPoint[] = [];

  for (let i = lookback; i < candles.length - lookback; i++) {
    const currentHigh = candles[i].high;
    const currentLow = candles[i].low;

    // Check Swing High
    let isSwingHigh = true;
    for (let j = i - lookback; j <= i + lookback; j++) {
      if (j !== i && candles[j].high > currentHigh) {
        isSwingHigh = false;
        break;
      }
    }

    if (isSwingHigh) {
      swings.push({
        index: i,
        type: 'HIGH',
        price: currentHigh,
        date: candles[i].time
      });
    }

    // Check Swing Low
    let isSwingLow = true;
    for (let j = i - lookback; j <= i + lookback; j++) {
      if (j !== i && candles[j].low < currentLow) {
        isSwingLow = false;
        break;
      }
    }

    if (isSwingLow) {
      swings.push({
        index: i,
        type: 'LOW',
        price: currentLow,
        date: candles[i].time
      });
    }
  }

  return swings;
}

/**
 * Detects Bullish and Bearish Order Blocks from OHLCV candle data
 * Order Block identification is strictly deterministic and based on structural price formation.
 */
export function detectOrderBlocks(
  symbol: string,
  candles: Candle[],
  timeframe: Timeframe,
  currentPrice: number,
  currencySymbol: string = ''
): { bullishOBs: OrderBlock[]; bearishOBs: OrderBlock[] } {
  if (candles.length < 10) {
    return { bullishOBs: [], bearishOBs: [] };
  }

  const swingPoints = findSwingPoints(candles, 2);
  const detectedBullishMap = new Map<string, OrderBlock>();
  const detectedBearishMap = new Map<string, OrderBlock>();

  // 1. Detect Bullish Order Blocks:
  // Down candle before an impulse break of a previous swing high (Break of Structure - BOS)
  for (let i = 3; i < candles.length; i++) {
    const priorHighs = swingPoints.filter(s => s.type === 'HIGH' && s.index < i && i - s.index <= 50);

    for (const swing of priorHighs) {
      if (candles[i].close > swing.price && candles[i - 1].close <= swing.price) {
        let obCandleIdx = -1;
        for (let k = i - 1; k >= Math.max(0, swing.index - 2); k--) {
          if (candles[k].close <= candles[k].open) {
            obCandleIdx = k;
            break;
          }
        }

        if (obCandleIdx === -1 && i > 0) {
          obCandleIdx = i - 1;
        }

        if (obCandleIdx !== -1) {
          const obCandle = candles[obCandleIdx];
          const obHigh = Number(obCandle.high.toFixed(2));
          const obLow = Number(obCandle.low.toFixed(2));
          const meanThreshold = Number(((obHigh + obLow) / 2).toFixed(2));
          const obId = `${symbol}_${timeframe}_BULL_${obCandle.time}_${obCandleIdx}`;

          if (!detectedBullishMap.has(obId)) {
            // Check subsequent violation: closed significantly below OB low
            let isViolated = false;
            for (let m = obCandleIdx + 1; m < candles.length; m++) {
              if (candles[m].close < obLow * 0.97) {
                isViolated = true;
                break;
              }
            }

            let status: OrderBlockStatus = 'WAITING';
            let isInside = false;

            if (isViolated) {
              status = 'INVALID';
            } else if (currentPrice >= obLow && currentPrice <= obHigh) {
              status = 'ACTIVE';
              isInside = true;
            } else if (currentPrice < obLow) {
              status = 'BELOW';
            } else {
              status = 'WAITING';
            }

            const curr = currencySymbol ? `${currencySymbol}` : '';
            detectedBullishMap.set(obId, {
              id: obId,
              symbol,
              type: 'Bullish',
              timeframe,
              high: obHigh,
              low: obLow,
              meanThreshold,
              referenceCandleDate: obCandle.time,
              referenceCandleIndex: obCandleIdx,
              formationPrice: obCandle.close,
              marketStructureInfo: `BOS High at ${curr}${swing.price.toFixed(2)} broken on ${candles[i].time}`,
              status,
              distancePercent: Number((((currentPrice - obHigh) / obHigh) * 100).toFixed(2)),
              isPriceInside: isInside,
              identifiedAt: obCandle.time
            });
          }
        }
      }
    }

    // 2. Detect Bearish Order Blocks:
    // Up candle before an impulse break of a previous swing low (Break of Structure - BOS)
    const priorLows = swingPoints.filter(s => s.type === 'LOW' && s.index < i && i - s.index <= 50);

    for (const swing of priorLows) {
      if (candles[i].close < swing.price && candles[i - 1].close >= swing.price) {
        let obCandleIdx = -1;
        for (let k = i - 1; k >= Math.max(0, swing.index - 2); k--) {
          if (candles[k].close >= candles[k].open) {
            obCandleIdx = k;
            break;
          }
        }

        if (obCandleIdx === -1 && i > 0) {
          obCandleIdx = i - 1;
        }

        if (obCandleIdx !== -1) {
          const obCandle = candles[obCandleIdx];
          const obHigh = Number(obCandle.high.toFixed(2));
          const obLow = Number(obCandle.low.toFixed(2));
          const meanThreshold = Number(((obHigh + obLow) / 2).toFixed(2));
          const obId = `${symbol}_${timeframe}_BEAR_${obCandle.time}_${obCandleIdx}`;

          if (!detectedBearishMap.has(obId)) {
            let isViolated = false;
            for (let m = obCandleIdx + 1; m < candles.length; m++) {
              if (candles[m].close > obHigh * 1.03) {
                isViolated = true;
                break;
              }
            }

            let status: OrderBlockStatus = 'WAITING';
            let isInside = false;

            if (isViolated) {
              status = 'INVALID';
            } else if (currentPrice >= obLow && currentPrice <= obHigh) {
              status = 'ACTIVE';
              isInside = true;
            } else if (currentPrice > obHigh) {
              status = 'ABOVE';
            } else {
              status = 'WAITING';
            }

            const curr = currencySymbol ? `${currencySymbol}` : '';
            detectedBearishMap.set(obId, {
              id: obId,
              symbol,
              type: 'Bearish',
              timeframe,
              high: obHigh,
              low: obLow,
              meanThreshold,
              referenceCandleDate: obCandle.time,
              referenceCandleIndex: obCandleIdx,
              formationPrice: obCandle.close,
              marketStructureInfo: `BOS Low at ${curr}${swing.price.toFixed(2)} broken on ${candles[i].time}`,
              status,
              distancePercent: Number((((currentPrice - obLow) / obLow) * 100).toFixed(2)),
              isPriceInside: isInside,
              identifiedAt: obCandle.time
            });
          }
        }
      }
    }
  }

  // Filter valid (non-invalidated) Order Blocks
  let validBullish = Array.from(detectedBullishMap.values()).filter(ob => ob.status !== 'INVALID');
  let validBearish = Array.from(detectedBearishMap.values()).filter(ob => ob.status !== 'INVALID');

  // Key Swing Demand Fallback if market was heavily trending
  if (validBullish.length === 0 && swingPoints.length > 0) {
    const lows = swingPoints.filter(s => s.type === 'LOW').slice(-3);
    for (const lowPoint of lows) {
      const obCandle = candles[lowPoint.index];
      const obHigh = Number((obCandle.high * 1.008).toFixed(2));
      const obLow = Number((obCandle.low * 0.995).toFixed(2));
      const meanThreshold = Number(((obHigh + obLow) / 2).toFixed(2));
      const obId = `${symbol}_${timeframe}_BULL_${obCandle.time}_${lowPoint.index}`;
      const isInside = currentPrice >= obLow && currentPrice <= obHigh;
      const curr = currencySymbol ? `${currencySymbol}` : '';

      validBullish.push({
        id: obId,
        symbol,
        type: 'Bullish',
        timeframe,
        high: obHigh,
        low: obLow,
        meanThreshold,
        referenceCandleDate: obCandle.time,
        referenceCandleIndex: lowPoint.index,
        formationPrice: obCandle.close,
        marketStructureInfo: `Demand Zone at swing low ${curr}${lowPoint.price.toFixed(2)}`,
        status: isInside ? 'ACTIVE' : (currentPrice < obLow ? 'BELOW' : 'WAITING'),
        distancePercent: Number((((currentPrice - obHigh) / obHigh) * 100).toFixed(2)),
        isPriceInside: isInside,
        identifiedAt: obCandle.time
      });
    }
  }

  // Key Swing Supply Fallback if market was heavily trending
  if (validBearish.length === 0 && swingPoints.length > 0) {
    const highs = swingPoints.filter(s => s.type === 'HIGH').slice(-3);
    for (const highPoint of highs) {
      const obCandle = candles[highPoint.index];
      const obHigh = Number((obCandle.high * 1.005).toFixed(2));
      const obLow = Number((obCandle.low * 0.992).toFixed(2));
      const meanThreshold = Number(((obHigh + obLow) / 2).toFixed(2));
      const obId = `${symbol}_${timeframe}_BEAR_${obCandle.time}_${highPoint.index}`;
      const isInside = currentPrice >= obLow && currentPrice <= obHigh;
      const curr = currencySymbol ? `${currencySymbol}` : '';

      validBearish.push({
        id: obId,
        symbol,
        type: 'Bearish',
        timeframe,
        high: obHigh,
        low: obLow,
        meanThreshold,
        referenceCandleDate: obCandle.time,
        referenceCandleIndex: highPoint.index,
        formationPrice: obCandle.close,
        marketStructureInfo: `Supply Zone at swing high ${curr}${highPoint.price.toFixed(2)}`,
        status: isInside ? 'ACTIVE' : (currentPrice > obHigh ? 'ABOVE' : 'WAITING'),
        distancePercent: Number((((currentPrice - obLow) / obLow) * 100).toFixed(2)),
        isPriceInside: isInside,
        identifiedAt: obCandle.time
      });
    }
  }

  const finalBullish = validBullish
    .sort((a, b) => b.referenceCandleIndex - a.referenceCandleIndex)
    .slice(0, 6);

  const finalBearish = validBearish
    .sort((a, b) => b.referenceCandleIndex - a.referenceCandleIndex)
    .slice(0, 6);

  return {
    bullishOBs: finalBullish,
    bearishOBs: finalBearish
  };
}

/**
 * Resamples Daily candles to Weekly candles
 */
export function aggregateToWeekly(dailyCandles: Candle[]): Candle[] {
  if (!dailyCandles.length) return [];

  const weeklyMap = new Map<string, Candle[]>();

  for (const c of dailyCandles) {
    const d = new Date(c.timestamp);
    const day = d.getDay();
    const diff = d.getDate() - day + (day === 0 ? -6 : 1);
    const monday = new Date(d.setDate(diff));
    const weekKey = monday.toISOString().split('T')[0];

    if (!weeklyMap.has(weekKey)) {
      weeklyMap.set(weekKey, []);
    }
    weeklyMap.get(weekKey)!.push(c);
  }

  const weeklyCandles: Candle[] = [];

  for (const [weekDate, cList] of weeklyMap.entries()) {
    const open = cList[0].open;
    const close = cList[cList.length - 1].close;
    let high = -Infinity;
    let low = Infinity;
    let volume = 0;

    for (const item of cList) {
      if (item.high > high) high = item.high;
      if (item.low < low) low = item.low;
      volume += item.volume;
    }

    weeklyCandles.push({
      time: weekDate,
      timestamp: new Date(weekDate).getTime(),
      open: Number(open.toFixed(2)),
      high: Number(high.toFixed(2)),
      low: Number(low.toFixed(2)),
      close: Number(close.toFixed(2)),
      volume
    });
  }

  return weeklyCandles.sort((a, b) => a.timestamp - b.timestamp);
}
