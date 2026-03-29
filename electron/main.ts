import { app, BrowserWindow } from "electron";
import path from "path";
import { startServer } from "../server/index.js";

let apiPort = 3001;

function createWindow() {
  const win = new BrowserWindow({
    width: 1400,
    height: 900,
    title: "Conway's Game of Life",
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
    },
  });

  if (!app.isPackaged) {
    win.loadURL("http://localhost:5173");
    win.webContents.openDevTools();
  } else {
    const indexPath = path.join(__dirname, "..", "dist", "index.html");
    win.loadFile(indexPath, {
      query: { apiPort: String(apiPort) },
    });
  }

  return win;
}

app.whenReady().then(async () => {
  const appRoot = app.isPackaged ? path.join(__dirname, "..") : process.cwd();
  const userDataDir = app.isPackaged ? app.getPath("userData") : undefined;
  apiPort = await startServer(appRoot, userDataDir);
  createWindow();

  app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") {
    app.quit();
  }
});
