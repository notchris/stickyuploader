const {app, ipcMain, globalShortcut, BrowserWindow, Menu, Tray, Notification } = require('electron')
const screenshot = require('desktop-screenshot');
const Jimp = require('jimp');

const clipboardy = require('clipboardy');

const chromeLauncher = require('chrome-launcher');
const puppeteer = require('puppeteer');
const request = require('request');
const util = require('util');


const Store = require('electron-store');
const store = new Store();

let account = {
  email: null,
  pass: null
}

if (store.get('userEmail') && store.get('userPass')) {
  account.email = store.get('userEmail');
  account.pass = store.get('userPass')
}

let loggedIn = null;
let tray = null;
let mainWindow = null;
let settingsWindow = null;
let dim = null;
let note = null;

let uploadFile = (email,pass,path) => {
(async() => {

  const opts = {
    chromeFlags: ['--headless'],
    logLevel: 'info',
    output: 'json'
  };

  const chrome = await chromeLauncher.launch(opts);
  opts.port = chrome.port;

  const resp = await util.promisify(request)(`http://localhost:${opts.port}/json/version`);
  const {webSocketDebuggerUrl} = JSON.parse(resp.body);
  const browser = await puppeteer.connect({browserWSEndpoint: webSocketDebuggerUrl});

  const page = await browser.newPage()
  await page.goto('https://itsosticky.com/')
  await page.setViewport({ width: 1280, height: 800 })
  await page.click('#button_signin')
  await page.waitForSelector('#signin_itso')
  await page.click('#signin_itso')
  await page.waitForSelector('#email')
  await page.type('#email', email)
  await page.type('input[type="password"]', pass)
  await page.click('#login_submit')
  await page.waitForNavigation()
  await page.click('#button_upload')
  await page.waitForSelector('input[type="file"]')
  let elementHandle = await page.$('input[type="file"]');
  await elementHandle.uploadFile(path)
  await page.waitForSelector('img.img_preview')
  await page.click('#submit_upload')
  await page.waitForNavigation()
  await page.waitForSelector('input.input_link_copy')
  let imgUrl = await page.evaluate(() => {
        let elements = Array.from(document.querySelectorAll('input.input_link_copy'));
        let links = elements.map(element => {
            return element.value
        })
        return links;
    });
  browser.close()
  chrome.kill();
  clipboardy.writeSync(imgUrl[1]);
  note = new Notification({
    title: 'URL copied to clipboard.',
    body: imgUrl[1],
    silent: false,
    icon: 'img/icon.png'
  })
  note.show()
})();
}

// Load user preferences
if (!store.get('userEmail') && !store.get('userPass')) {
  loggedIn = false;
} else {
  loggedIn = true;
}


function createWindow () {
  let screen = require('electron').screen;
  dim = screen.getPrimaryDisplay().workAreaSize;

  let takeScreenPartial = (x,y,width,height) => {
    console.log(x,y,width,height)
    let fileName = 'screen_'+Date.now()+'.png';
    screenshot(fileName, function(error, complete) {
        if(error) {
          console.log("Screenshot failed", error);
        }
        else {
          // Success, crop image to rect area
          Jimp.read(fileName, (err, shot) => {
            if (err) throw err;
            shot
              .crop(x, y, width, height)
              .write(fileName)

            uploadFile(account.email,account.pass,fileName)
          })
        }
    })
  }

  ipcMain.on('screenshot', (event, args) => {
    let r = JSON.parse(args);
    mainWindow.close() // Close window after screenshot
    takeScreenPartial(r.x,r.y,r.width,r.height)
  });

  ipcMain.on('update-account', (event, args) => {
    let details = JSON.parse(args);
    store.set('userEmail',details.email);
    store.set('userPass',details.pass);
    loggedIn = true;
    console.log('Updated user.')
  });



  // Open the DevTools.
  //mainWindow.webContents.openDevTools()
}

app.on('ready', () => {
  createWindow()
  tray = new Tray('img/icon.png')
  const contextMenu = Menu.buildFromTemplate([
    { label: 'Capture', type: 'normal', click: function(event) {

      mainWindow = new BrowserWindow({
        width: dim.width,
        height: dim.height,
        fullscreen: false,
        transparent: true,
        frame: false,
        webPreferences: {
          nodeIntegration: true
        }
      })

      mainWindow.setAlwaysOnTop(true, "floating");
      mainWindow.setVisibleOnAllWorkspaces(true);
      mainWindow.setFullScreenable(false);

      mainWindow.loadFile('index.html')
      mainWindow.show()

      mainWindow.on('closed', function () {
        mainWindow = null
      })
    }},
    {label: 'Capture Desktop', type: 'normal', click: function(event) {
      let takeScreenFull = () => {
        let fileName = 'screen_'+Date.now()+'.png';
        screenshot(fileName, function(error, complete) {
            if(error) {
              console.log("Screenshot failed", error);
            } 
            else {
              // Upload File
              uploadFile(account.email,account.pass,fileName)
            }
        })
      }
      takeScreenFull()
    }},
    {label: 'Settings', type: 'normal', click: function(event) {
      settingsWindow = new BrowserWindow({
        width: 800,
        height: 600,
        fullscreen: false,
        transparent: false,
        frame: true,
        webPreferences: {
          nodeIntegration: true
        }
      })
      settingsWindow.loadFile('settings.html')
      settingsWindow.show()

      settingsWindow.on('closed', function () {
        settingsWindow = null
      })
    }},
    {label: 'Close', type: 'normal', click: function(event) {
      app.quit();
    }}
  ])
  tray.setToolTip('Itsosticky')
  tray.setContextMenu(contextMenu)
})

app.on('window-all-closed', e => e.preventDefault() )

