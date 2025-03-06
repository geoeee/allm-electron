const { app, BrowserWindow } = require("electron");
const { spawn } = require("child_process");
const path = require("path");

let childProcesses = [];

const projectPath = path.join(__dirname, "../public/anything-llm");

console.log("projectPath", projectPath);

// Handle creating/removing shortcuts on Windows when installing/uninstalling.
if (require("electron-squirrel-startup")) {
  app.quit();
}

const createWindow = () => {
  // Create the browser window.
  const mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    resizable: true,
    transparent: true,
    backgroundColor: "#00000000",
    autoHideMenuBar: true,
    frame: true,
    webPreferences: {
      preload: path.join(__dirname, "preload.js"),
    },
  });

  // and load the index.html of the app.
  // mainWindow.loadFile(path.join(__dirname, 'index.html'));
  mainWindow.loadURL("http://localhost:3000");

  // Open the DevTools.
  // mainWindow.webContents.openDevTools();
};

// This method will be called when Electron has finished
// initialization and is ready to create browser windows.
// Some APIs can only be used after this event occurs.
app.whenReady().then(() => {
  initLLM();

  setTimeout(() => {
    createWindow();
  }, 5000);

  // On OS X it's common to re-create a window in the app when the
  // dock icon is clicked and there are no other windows open.
  app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

function initLLM() {
  startExternalProject(
    "node",
    ["--trace-warnings", `${projectPath}/server/index.js`],
    {
      SERVER_PORT: 3001,
      DATABASE_URL: "file:../storage/anythingllm.db",
      SIG_KEY: "passphrase",
      SIG_SALT: "salt",
      VECTOR_DB: "lancedb",
      WHISPER_PROVIDER: "local",
      TTS_PROVIDER: "native",
      STORAGE_DIR: "../../storage",
    },
    `${projectPath}/server`
  );
  startExternalProject(
    "node",
    ["--trace-warnings", `${projectPath}/collector/index.js`],
    {},
    `${projectPath}/collector`
  );
  startExternalProject(
    "yarn",
    ["dev"],
    { VITE_API_BASE: "http://localhost:3001/api" },
    `${projectPath}/frontend`
  );
}

function startExternalProject(cmd, args, env, cwd) {
  const startEnv = { ...process.env, ...(env || {}), NODE_ENV: "development" };
  try {
    console.log("[Process]", cmd, args, cwd);
    childProcess = spawn(cmd, args, {
      env: startEnv,
      cwd,
      shell: true,
      detached: true,
      stdio: "inherit",
    });
    childProcess.unref();
    childProcesses.push(childProcess);

    // childProcess.on("close", (code) => {
    //   console.log(`子进程退出，退出码: ${code}`);
    //   childProcesses = childProcesses.filter((cp) => cp !== childProcess);
    // });
  } catch (e) {
    console.error(e);
  }
}

app.on("before-quit", () => {
  childProcesses.forEach((child) => {
    if (child && !child.killed) {
      child.kill("SIGTERM");
    }
  });
  childProcesses = [];
});

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") {
    app.quit();
  }
});
