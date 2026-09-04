# ORDER BLOCK DETECTOR

> Global Institutional Order Block Detection & Real-Time Stock Market Monitoring Platform

---

## 🚀 How to Run in Visual Studio Code (VS Code)

### Prerequisites:
- **Node.js** (v18 or higher): Download from [nodejs.org](https://nodejs.org/)
- **Visual Studio Code**: Download from [code.visualstudio.com](https://code.visualstudio.com/)

---

### Method 1: The Quickest 1-Click Launch (Windows)
1. Extract `order-block-detector.zip`.
2. Double-click **`start.bat`**.
3. It will automatically install dependencies, build the TypeScript server, and open both the Server (port 5000) and Client (port 5173).
4. Open your browser at: **`http://localhost:5173`**

---

### Method 2: Running Inside VS Code Terminals

1. Open **VS Code**.
2. Click **File** $\rightarrow$ **Open Folder...** and select the `order-block-detector` folder.
3. Open a terminal in VS Code (`Ctrl + ` ` or `Terminal` $\rightarrow$ `New Terminal`).

#### Terminal 1 — Start the Backend Server:
```bash
cd server
npm install
npm run build
npm start
```
*Server will start at: `http://localhost:5000/api`*

#### Terminal 2 — Start the Frontend UI:
Click the **`+`** icon in the terminal panel to open a 2nd terminal tab:
```bash
cd client
npm install
npm run dev
```
*Client will start at: `http://localhost:5173`*

---

## 🔑 Default Accounts for Testing

| Role | Email | Password |
| :--- | :--- | :--- |
| **Master Owner / Admin** | `admin@orderblock.com` | `admin123` |
| **Demo Trader** | `trader@orderblock.com` | `trader123` |

---

## 📧 Real Gmail OTP Setup (Optional)
To send real verification emails directly to Gmail:
1. Open `server/.env`.
2. Add your Gmail and 16-character [Google App Password](https://myaccount.google.com/apppasswords):
   ```env
   SMTP_HOST=smtp.gmail.com
   SMTP_PORT=465
   SMTP_USER=your-email@gmail.com
   SMTP_PASS=xxxx xxxx xxxx xxxx
   ```
