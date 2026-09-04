import React, { useState, useRef, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import {
  Activity,
  Lock,
  Mail,
  User,
  X,
  LogIn,
  UserPlus,
  Eye,
  EyeOff,
  ArrowRight,
  KeyRound,
  RotateCcw,
  CheckCircle2,
  ArrowLeft,
  HelpCircle
} from 'lucide-react';

interface AuthPageProps {
  isOpen: boolean;
  onClose: () => void;
}

type AuthMode = 'LOGIN' | 'SIGNUP' | 'SIGNUP_OTP' | 'FORGOT_EMAIL' | 'FORGOT_RESET';

export const AuthModal: React.FC<AuthPageProps> = ({ isOpen, onClose }) => {
  const { login, sendOtp, verifyOtp, resendOtp, forgotPasswordSendOtp, forgotPasswordReset } = useAuth();
  const [mode, setMode] = useState<AuthMode>('LOGIN');

  // Form State
  const [name, setName] = useState<string>('');
  const [email, setEmail] = useState<string>('');
  const [password, setPassword] = useState<string>('');
  const [newPassword, setNewPassword] = useState<string>('');
  const [showPassword, setShowPassword] = useState<boolean>(false);
  const [showNewPassword, setShowNewPassword] = useState<boolean>(false);

  // OTP State (6 individual digits)
  const [otpDigits, setOtpDigits] = useState<string[]>(['', '', '', '', '', '']);
  const [resendTimer, setResendTimer] = useState<number>(60);
  const [canResend, setCanResend] = useState<boolean>(false);

  // UI Status
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [loading, setLoading] = useState<boolean>(false);

  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);

  // Timer for OTP resend in OTP modes
  useEffect(() => {
    let interval: any;
    if ((mode === 'SIGNUP_OTP' || mode === 'FORGOT_RESET') && resendTimer > 0) {
      interval = setInterval(() => {
        setResendTimer((prev) => {
          if (prev <= 1) {
            setCanResend(true);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [mode, resendTimer]);

  // Reset when modal opens/closes or when switching to forgot password
  useEffect(() => {
    if (!isOpen) {
      setMode('LOGIN');
      setErrorMsg(null);
      setSuccessMsg(null);
      setOtpDigits(['', '', '', '', '', '']);
      setPassword('');
      setNewPassword('');
    }
  }, [isOpen]);

  useEffect(() => {
    if (mode === 'FORGOT_EMAIL' || mode === 'FORGOT_RESET') {
      setPassword('');
      setNewPassword('');
    }
  }, [mode]);

  if (!isOpen) return null;

  const emailRegex = /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)+$/;

  // Handle Standard Login / Signup Form Submission
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setSuccessMsg(null);

    const cleanEmail = email.trim().toLowerCase();

    if (!emailRegex.test(cleanEmail)) {
      setErrorMsg('Please enter a valid email address (e.g. name@gmail.com).');
      return;
    }

    if (password.length < 6) {
      setErrorMsg('Password must be at least 6 characters long.');
      return;
    }

    setLoading(true);

    try {
      if (mode === 'SIGNUP') {
        // Step 1: Send OTP to user's real Gmail for registration
        const res = await sendOtp(name, cleanEmail, password);

        if (res.alreadyRegistered) {
          onClose();
          return;
        }

        setMode('SIGNUP_OTP');
        setResendTimer(60);
        setCanResend(false);
        setSuccessMsg(`Verification code dispatched to ${cleanEmail}`);
        if (res.otp) {
          const digits = res.otp.split('').slice(0, 6);
          setOtpDigits(digits);
        }
        setTimeout(() => {
          inputRefs.current[0]?.focus();
        }, 100);
      } else {
        // Standard Log In
        await login(cleanEmail, password);
        onClose();
      }
    } catch (err: any) {
      setErrorMsg(err.message || 'Authentication error.');
    } finally {
      setLoading(false);
    }
  };

  // Handle Forgot Password - Step 1: Send Reset OTP
  const handleForgotSendOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setSuccessMsg(null);

    const cleanEmail = email.trim().toLowerCase();

    if (!emailRegex.test(cleanEmail)) {
      setErrorMsg('Please enter a valid registered email address.');
      return;
    }

    setLoading(true);

    try {
      const res = await forgotPasswordSendOtp(cleanEmail);
      setMode('FORGOT_RESET');
      setResendTimer(60);
      setCanResend(false);
      if (res.otp) {
        setOtpDigits(res.otp.split('').slice(0, 6));
      } else {
        setOtpDigits(['', '', '', '', '', '']);
      }
      setNewPassword('');
      setSuccessMsg(`Password reset code sent to ${cleanEmail}`);
      setTimeout(() => {
        inputRefs.current[0]?.focus();
      }, 100);
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to send reset code.');
    } finally {
      setLoading(false);
    }
  };

  // Handle Forgot Password - Step 2: Verify OTP & Save New Password
  const handleForgotResetSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const code = otpDigits.join('');
    if (code.length !== 6) {
      setErrorMsg('Please enter the complete 6-digit verification code.');
      return;
    }

    if (newPassword.length < 6) {
      setErrorMsg('New password must be at least 6 characters long.');
      return;
    }

    setLoading(true);
    setErrorMsg(null);

    try {
      await forgotPasswordReset(email.trim().toLowerCase(), code, newPassword);
      onClose();
    } catch (err: any) {
      setErrorMsg(err.message || 'Invalid or expired reset code.');
    } finally {
      setLoading(false);
    }
  };

  // Handle OTP Digit Inputs
  const handleOtpChange = (index: number, val: string) => {
    const digit = val.replace(/[^0-9]/g, '').slice(-1);
    const newDigits = [...otpDigits];
    newDigits[index] = digit;
    setOtpDigits(newDigits);
    setErrorMsg(null);

    // Auto-advance to next input
    if (digit && index < 5) {
      inputRefs.current[index + 1]?.focus();
    }

    // Auto-submit in signup mode if all 6 digits entered
    const fullCode = newDigits.join('');
    if (fullCode.length === 6 && mode === 'SIGNUP_OTP') {
      handleVerifySignupOtp(fullCode);
    }
  };

  // Handle Backspace navigation
  const handleKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Backspace' && !otpDigits[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
  };

  // Handle Paste of full OTP
  const handlePaste = (e: React.ClipboardEvent) => {
    e.preventDefault();
    const pasted = e.clipboardData.getData('text').replace(/[^0-9]/g, '').slice(0, 6);
    if (pasted.length > 0) {
      const newDigits = [...otpDigits];
      for (let i = 0; i < 6; i++) {
        newDigits[i] = pasted[i] || '';
      }
      setOtpDigits(newDigits);
      if (pasted.length === 6 && mode === 'SIGNUP_OTP') {
        handleVerifySignupOtp(pasted);
      } else {
        inputRefs.current[pasted.length]?.focus();
      }
    }
  };

  // Verify Signup OTP submission
  const handleVerifySignupOtp = async (codeOverride?: string) => {
    const code = codeOverride || otpDigits.join('');
    if (code.length !== 6) {
      setErrorMsg('Please enter the complete 6-digit verification code.');
      return;
    }

    setLoading(true);
    setErrorMsg(null);

    try {
      await verifyOtp(email.trim().toLowerCase(), code);
      onClose();
    } catch (err: any) {
      setErrorMsg(err.message || 'Invalid or expired verification code.');
    } finally {
      setLoading(false);
    }
  };

  // Resend OTP for Signup or Forgot Password
  const handleResend = async () => {
    if (!canResend || loading) return;
    setLoading(true);
    setErrorMsg(null);
    try {
      if (mode === 'FORGOT_RESET') {
        const res = await forgotPasswordSendOtp(email.trim().toLowerCase());
        setSuccessMsg('A new password reset code has been sent to your Gmail.');
        if (res.otp) {
          setOtpDigits(res.otp.split('').slice(0, 6));
        }
      } else {
        const res = await resendOtp(email.trim().toLowerCase());
        setSuccessMsg('A fresh verification code has been dispatched.');
        if (res.otp) {
          setOtpDigits(res.otp.split('').slice(0, 6));
        }
      }
      setResendTimer(60);
      setCanResend(false);
    } catch (err: any) {
      setErrorMsg(err.message || 'Error resending code.');
    } finally {
      setLoading(false);
    }
  };

  const isEmailAlreadyExists = errorMsg && errorMsg.toLowerCase().includes('already exists');

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/85 backdrop-blur-md flex items-center justify-center p-4">
      <div className="bg-slate-900 border border-slate-700 max-w-md w-full rounded-2xl p-6 sm:p-8 shadow-2xl space-y-5 relative overflow-hidden">
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-2 text-slate-400 hover:text-white rounded-lg transition-colors"
          aria-label="Close"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Brand Header */}
        <div className="text-center space-y-2">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-emerald-600 via-teal-500 to-sky-500 flex items-center justify-center shadow-lg shadow-emerald-900/40 mx-auto">
            {mode === 'SIGNUP_OTP' || mode === 'FORGOT_RESET' ? (
              <KeyRound className="w-6 h-6 text-white" />
            ) : mode === 'FORGOT_EMAIL' ? (
              <HelpCircle className="w-6 h-6 text-white" />
            ) : (
              <Activity className="w-7 h-7 text-white" />
            )}
          </div>
          <h2 className="text-xl font-extrabold text-white tracking-tight">
            {mode === 'SIGNUP_OTP'
              ? 'VERIFY YOUR GMAIL'
              : mode === 'FORGOT_EMAIL'
              ? 'RESET YOUR PASSWORD'
              : mode === 'FORGOT_RESET'
              ? 'SET NEW PASSWORD'
              : 'ORDER BLOCK DETECTOR'}
          </h2>
          <p className="text-xs text-slate-400 font-medium">
            {mode === 'SIGNUP_OTP'
              ? 'Enter the 6-digit verification code sent to your Gmail'
              : mode === 'FORGOT_EMAIL'
              ? 'Enter your registered email to receive a 6-digit reset code'
              : mode === 'FORGOT_RESET'
              ? 'Enter the 6-digit code and choose your new password'
              : mode === 'SIGNUP'
              ? 'Create your free trading account with email verification'
              : 'Log in to your trading dashboard'}
          </p>
        </div>

        {/* ======================================================== */}
        {/* VIEW 1: STANDARD LOGIN & SIGNUP */}
        {/* ======================================================== */}
        {(mode === 'LOGIN' || mode === 'SIGNUP') && (
          <>
            {/* Mode Switcher Tabs (Log In vs Sign Up) */}
            <div className="flex rounded-xl bg-slate-950 p-1 border border-slate-800">
              <button
                type="button"
                onClick={() => {
                  setMode('LOGIN');
                  setErrorMsg(null);
                  setSuccessMsg(null);
                }}
                className={`flex-1 py-2 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-1.5 ${
                  mode === 'LOGIN' ? 'bg-emerald-600 text-white shadow-md' : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                <LogIn className="w-3.5 h-3.5" />
                <span>Log In</span>
              </button>
              <button
                type="button"
                onClick={() => {
                  setMode('SIGNUP');
                  setErrorMsg(null);
                  setSuccessMsg(null);
                }}
                className={`flex-1 py-2 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-1.5 ${
                  mode === 'SIGNUP' ? 'bg-emerald-600 text-white shadow-md' : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                <UserPlus className="w-3.5 h-3.5" />
                <span>Sign Up Free</span>
              </button>
            </div>

            {/* Form Fields */}
            <form onSubmit={handleSubmit} className="space-y-3.5 pt-1">
              {mode === 'SIGNUP' && (
                <div>
                  <label className="text-xs font-medium text-slate-300 block mb-1">Full Name</label>
                  <div className="relative">
                    <User className="absolute left-3.5 top-3 w-4 h-4 text-slate-500" />
                    <input
                      type="text"
                      required
                      placeholder="e.g. Alex Morgan"
                      value={name}
                      onChange={(e) => {
                        setName(e.target.value);
                        if (errorMsg) setErrorMsg(null);
                      }}
                      className="w-full pl-10 pr-3 py-2.5 bg-slate-950 border border-slate-700 focus:border-emerald-500 rounded-xl text-xs text-white focus:outline-none font-medium"
                    />
                  </div>
                </div>
              )}

              <div>
                <label className="text-xs font-medium text-slate-300 block mb-1">Gmail / Email Address</label>
                <div className="relative">
                  <Mail className="absolute left-3.5 top-3 w-4 h-4 text-slate-500" />
                  <input
                    type="email"
                    required
                    placeholder="your-name@gmail.com"
                    value={email}
                    onChange={(e) => {
                      setEmail(e.target.value);
                      if (errorMsg) setErrorMsg(null);
                    }}
                    className="w-full pl-10 pr-3 py-2.5 bg-slate-950 border border-slate-700 focus:border-emerald-500 rounded-xl text-xs text-white focus:outline-none font-mono"
                  />
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-xs font-medium text-slate-300">Password</label>
                  {mode === 'LOGIN' && (
                    <button
                      type="button"
                      onClick={() => {
                        setMode('FORGOT_EMAIL');
                        setErrorMsg(null);
                        setSuccessMsg(null);
                      }}
                      className="text-[11px] text-emerald-400 hover:text-emerald-300 font-semibold hover:underline"
                    >
                      Forgot Password?
                    </button>
                  )}
                </div>
                <div className="relative">
                  <Lock className="absolute left-3.5 top-3 w-4 h-4 text-slate-500" />
                  <input
                    type={showPassword ? 'text' : 'password'}
                    required
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => {
                      setPassword(e.target.value);
                      if (errorMsg) setErrorMsg(null);
                    }}
                    className="w-full pl-10 pr-10 py-2.5 bg-slate-950 border border-slate-700 focus:border-emerald-500 rounded-xl text-xs text-white focus:outline-none font-mono"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-2.5 text-slate-500 hover:text-slate-300 p-1"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              {successMsg && !errorMsg && (
                <div className="p-3 rounded-xl bg-amber-950/40 border border-amber-500/40 text-center">
                  <p className="text-xs font-semibold text-amber-300">
                    {successMsg}
                  </p>
                </div>
              )}

              {/* Error Message with direct Log In transition */}
              {errorMsg && (
                <div className="p-3 rounded-xl bg-rose-950/50 border border-rose-800/80 text-center space-y-2">
                  <p className="text-xs font-semibold text-rose-300">
                    {errorMsg}
                  </p>
                  {isEmailAlreadyExists && (
                    <button
                      type="button"
                      onClick={() => {
                        setMode('LOGIN');
                        setErrorMsg(null);
                      }}
                      className="w-full py-1.5 px-3 bg-rose-500/20 hover:bg-rose-500/30 text-rose-200 border border-rose-500/40 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-1.5"
                    >
                      <span>Click Here to Log In with this Email</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              )}

              <button
                type="submit"
                disabled={loading}
                className="w-full py-3 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white rounded-xl text-xs sm:text-sm font-bold shadow-lg shadow-emerald-950/40 transition-all mt-2 flex items-center justify-center gap-2"
              >
                {loading ? (
                  <span>Processing...</span>
                ) : mode === 'SIGNUP' ? (
                  <>
                    <span>Send 6-Digit Verification Code</span>
                    <ArrowRight className="w-4 h-4" />
                  </>
                ) : (
                  <span>Log In</span>
                )}
              </button>
            </form>

            {/* Toggle link between Login and Signup */}
            <div className="text-center pt-1 text-xs text-slate-400">
              {mode === 'SIGNUP' ? (
                <span>
                  Already have an account?{' '}
                  <button
                    type="button"
                    onClick={() => {
                      setMode('LOGIN');
                      setErrorMsg(null);
                    }}
                    className="text-emerald-400 font-bold hover:underline"
                  >
                    Log In
                  </button>
                </span>
              ) : (
                <span>
                  Don't have an account?{' '}
                  <button
                    type="button"
                    onClick={() => {
                      setMode('SIGNUP');
                      setErrorMsg(null);
                    }}
                    className="text-emerald-400 font-bold hover:underline"
                  >
                    Sign Up Free
                  </button>
                </span>
              )}
            </div>
          </>
        )}

        {/* ======================================================== */}
        {/* VIEW 2: 6-DIGIT EMAIL OTP VERIFICATION (FOR SIGN UP) */}
        {/* ======================================================== */}
        {mode === 'SIGNUP_OTP' && (
          <div className="space-y-4">
            <div className="p-3 bg-slate-950 border border-slate-800 rounded-xl text-center space-y-1">
              <span className="text-xs text-slate-400">Verification code sent to:</span>
              <p className="font-mono font-bold text-sm text-sky-400">{email}</p>
              <p className="text-[11px] text-slate-500 pt-1">
                Please check your Gmail inbox (or Spam/Updates tab) for the 6-digit code.
              </p>
            </div>

            {/* 6 OTP Input Boxes */}
            <div className="flex items-center justify-center gap-2 py-2" onPaste={handlePaste}>
              {otpDigits.map((digit, index) => (
                <input
                  key={index}
                  ref={(el) => {
                    inputRefs.current[index] = el;
                  }}
                  type="text"
                  inputMode="numeric"
                  maxLength={1}
                  value={digit}
                  onChange={(e) => handleOtpChange(index, e.target.value)}
                  onKeyDown={(e) => handleKeyDown(index, e)}
                  className={`w-11 h-12 text-center font-mono font-extrabold text-lg rounded-xl border bg-slate-950 text-white focus:outline-none transition-all ${
                    digit
                      ? 'border-emerald-500 shadow-md shadow-emerald-950/40 ring-1 ring-emerald-500/40'
                      : 'border-slate-700 focus:border-sky-500'
                  }`}
                />
              ))}
            </div>

            {errorMsg && (
              <p className="text-xs font-semibold text-rose-300 bg-rose-950/50 p-2.5 rounded-lg border border-rose-800/80 text-center">
                {errorMsg}
              </p>
            )}

            {successMsg && !errorMsg && (
              <p className="text-xs font-semibold text-emerald-400 bg-emerald-950/30 p-2 rounded-lg border border-emerald-500/30 text-center flex items-center justify-center gap-1.5">
                <CheckCircle2 className="w-3.5 h-3.5" />
                <span>{successMsg}</span>
              </p>
            )}

            <button
              type="button"
              onClick={() => handleVerifySignupOtp()}
              disabled={loading || otpDigits.join('').length !== 6}
              className="w-full py-3 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white rounded-xl text-xs sm:text-sm font-bold shadow-lg shadow-emerald-950/40 transition-all flex items-center justify-center gap-2"
            >
              {loading ? 'Verifying...' : 'Verify & Activate Account'}
            </button>

            {/* Resend & Edit Email Controls */}
            <div className="flex items-center justify-between text-xs text-slate-400 pt-2 border-t border-slate-800">
              <button
                type="button"
                onClick={() => {
                  setMode('SIGNUP');
                  setErrorMsg(null);
                }}
                className="hover:text-white flex items-center gap-1 transition-colors"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                <span>Edit Email</span>
              </button>

              <button
                type="button"
                onClick={handleResend}
                disabled={!canResend || loading}
                className={`flex items-center gap-1 font-semibold transition-colors ${
                  canResend ? 'text-sky-400 hover:underline cursor-pointer' : 'text-slate-500 cursor-not-allowed'
                }`}
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>{canResend ? 'Resend Code' : `Resend in ${resendTimer}s`}</span>
              </button>
            </div>
          </div>
        )}

        {/* ======================================================== */}
        {/* VIEW 3: FORGOT PASSWORD - STEP 1 (ENTER EMAIL) */}
        {/* ======================================================== */}
        {mode === 'FORGOT_EMAIL' && (
          <form onSubmit={handleForgotSendOtp} className="space-y-4">
            <div>
              <label className="text-xs font-medium text-slate-300 block mb-1">Your Registered Gmail / Email</label>
              <div className="relative">
                <Mail className="absolute left-3.5 top-3 w-4 h-4 text-slate-500" />
                <input
                  type="email"
                  required
                  placeholder="your-name@gmail.com"
                  value={email}
                  onChange={(e) => {
                    setEmail(e.target.value);
                    if (errorMsg) setErrorMsg(null);
                  }}
                  className="w-full pl-10 pr-3 py-2.5 bg-slate-950 border border-slate-700 focus:border-emerald-500 rounded-xl text-xs text-white focus:outline-none font-mono"
                />
              </div>
            </div>

            {errorMsg && (
              <p className="text-xs font-semibold text-rose-300 bg-rose-950/50 p-2.5 rounded-lg border border-rose-800/80 text-center">
                {errorMsg}
              </p>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white rounded-xl text-xs sm:text-sm font-bold shadow-lg shadow-emerald-950/40 transition-all flex items-center justify-center gap-2"
            >
              {loading ? (
                <span>Sending Code...</span>
              ) : (
                <>
                  <span>Send 6-Digit Password Reset Code</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>

            <div className="text-center pt-2 border-t border-slate-800">
              <button
                type="button"
                onClick={() => {
                  setMode('LOGIN');
                  setErrorMsg(null);
                  setSuccessMsg(null);
                }}
                className="text-xs text-slate-400 hover:text-white inline-flex items-center gap-1 transition-colors"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                <span>Back to Log In</span>
              </button>
            </div>
          </form>
        )}

        {/* ======================================================== */}
        {/* VIEW 4: FORGOT PASSWORD - STEP 2 (ENTER OTP & NEW PASSWORD) */}
        {/* ======================================================== */}
        {mode === 'FORGOT_RESET' && (
          <form onSubmit={handleForgotResetSubmit} className="space-y-4">
            <div className="p-3 bg-slate-950 border border-slate-800 rounded-xl text-center space-y-1">
              <span className="text-xs text-slate-400">Reset code sent to:</span>
              <p className="font-mono font-bold text-sm text-sky-400">{email}</p>
            </div>

            {/* 6 OTP Input Boxes */}
            <div>
              <label className="text-xs font-medium text-slate-300 block mb-1 text-center">
                Enter 6-Digit Code
              </label>
              <div className="flex items-center justify-center gap-2 py-1" onPaste={handlePaste}>
                {otpDigits.map((digit, index) => (
                  <input
                    key={index}
                    ref={(el) => {
                      inputRefs.current[index] = el;
                    }}
                    type="text"
                    inputMode="numeric"
                    maxLength={1}
                    value={digit}
                    onChange={(e) => handleOtpChange(index, e.target.value)}
                    onKeyDown={(e) => handleKeyDown(index, e)}
                    className={`w-11 h-12 text-center font-mono font-extrabold text-lg rounded-xl border bg-slate-950 text-white focus:outline-none transition-all ${
                      digit
                        ? 'border-emerald-500 shadow-md shadow-emerald-950/40 ring-1 ring-emerald-500/40'
                        : 'border-slate-700 focus:border-sky-500'
                    }`}
                  />
                ))}
              </div>
            </div>

            {/* New Password Input */}
            <div>
              <label className="text-xs font-medium text-slate-300 block mb-1">Set New Password</label>
              <div className="relative">
                <Lock className="absolute left-3.5 top-3 w-4 h-4 text-slate-500" />
                <input
                  type={showNewPassword ? 'text' : 'password'}
                  required
                  name="reset_new_password_field"
                  id="reset_new_password_field"
                  autoComplete="new-password"
                  data-lpignore="true"
                  placeholder="Min. 6 characters"
                  value={newPassword}
                  onChange={(e) => {
                    setNewPassword(e.target.value);
                    if (errorMsg) setErrorMsg(null);
                  }}
                  className="w-full pl-10 pr-10 py-2.5 bg-slate-950 border border-slate-700 focus:border-emerald-500 rounded-xl text-xs text-white focus:outline-none font-mono"
                />
                <button
                  type="button"
                  onClick={() => setShowNewPassword(!showNewPassword)}
                  className="absolute right-3 top-2.5 text-slate-500 hover:text-slate-300 p-1"
                >
                  {showNewPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {errorMsg && (
              <p className="text-xs font-semibold text-rose-300 bg-rose-950/50 p-2.5 rounded-lg border border-rose-800/80 text-center">
                {errorMsg}
              </p>
            )}

            {successMsg && !errorMsg && (
              <p className="text-xs font-semibold text-emerald-400 bg-emerald-950/30 p-2 rounded-lg border border-emerald-500/30 text-center flex items-center justify-center gap-1.5">
                <CheckCircle2 className="w-3.5 h-3.5" />
                <span>{successMsg}</span>
              </p>
            )}

            <button
              type="submit"
              disabled={loading || otpDigits.join('').length !== 6 || newPassword.length < 6}
              className="w-full py-3 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white rounded-xl text-xs sm:text-sm font-bold shadow-lg shadow-emerald-950/40 transition-all flex items-center justify-center gap-2"
            >
              {loading ? 'Updating Password...' : 'Save New Password & Log In'}
            </button>

            {/* Resend & Back Controls */}
            <div className="flex items-center justify-between text-xs text-slate-400 pt-2 border-t border-slate-800">
              <button
                type="button"
                onClick={() => {
                  setMode('FORGOT_EMAIL');
                  setErrorMsg(null);
                }}
                className="hover:text-white flex items-center gap-1 transition-colors"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                <span>Change Email</span>
              </button>

              <button
                type="button"
                onClick={handleResend}
                disabled={!canResend || loading}
                className={`flex items-center gap-1 font-semibold transition-colors ${
                  canResend ? 'text-sky-400 hover:underline cursor-pointer' : 'text-slate-500 cursor-not-allowed'
                }`}
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>{canResend ? 'Resend Code' : `Resend in ${resendTimer}s`}</span>
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};
