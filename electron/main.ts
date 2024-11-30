import { app, BrowserWindow } from 'electron'

app.whenReady().then(() => {
  const mainWindow = new BrowserWindow({
    title: 'Main window',
  })

  mainWindow.webContents.session.on('select-serial-port', (event, portList, webContents, callback) => {
    console.log(portList)
    mainWindow.webContents.session.on('serial-port-added', (event, port) => {
      console.log('serial-port-added FIRED WITH', port)
      // Optionally update portList to add the new port
    })
    mainWindow.webContents.session.on('serial-port-removed', (event, port) => {
      console.log('serial-port-removed FIRED WITH', port)
      // Optionally update portList to remove the port
    })

    event.preventDefault()
  })

  mainWindow.webContents.session.setPermissionCheckHandler((webContents, permission, requestingOrigin, details) => {
    return true
  })

  mainWindow.webContents.session.setDevicePermissionHandler((details) => {
    return true
  })


  mainWindow.webContents.openDevTools()

  // You can use `process.env.VITE_DEV_SERVER_URL` when the vite command is called `serve`
  if (process.env.VITE_DEV_SERVER_URL) {
    mainWindow.loadURL(process.env.VITE_DEV_SERVER_URL)
  } else {
    // Load your file
    mainWindow.loadFile('dist/index.html');
  }

  
})


app.on('window-all-closed', function () {
  if (process.platform !== 'darwin') app.quit()
})