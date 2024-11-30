import { app as s, BrowserWindow as a } from "electron";
s.whenReady().then(() => {
  const e = new a({
    title: "Main window"
  });
  e.webContents.session.on("select-serial-port", (n, t, i, r) => {
    console.log(t), e.webContents.session.on("serial-port-added", (l, o) => {
      console.log("serial-port-added FIRED WITH", o);
    }), e.webContents.session.on("serial-port-removed", (l, o) => {
      console.log("serial-port-removed FIRED WITH", o);
    }), n.preventDefault();
  }), e.webContents.session.setPermissionCheckHandler((n, t, i, r) => !0), e.webContents.session.setDevicePermissionHandler((n) => !0), e.webContents.openDevTools(), process.env.VITE_DEV_SERVER_URL ? e.loadURL(process.env.VITE_DEV_SERVER_URL) : e.loadFile("dist/index.html");
});
s.on("window-all-closed", function() {
  process.platform !== "darwin" && s.quit();
});
