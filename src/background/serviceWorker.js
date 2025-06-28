// @ts-check
// Handle updates
chrome.runtime.onInstalled.addListener((details) => {
  if (details.reason === 'install') {
    // Open the options page after install
    chrome.tabs.create({ url: 'src/Options/index.html' });
  }
});

// Download images
/** @typedef {{ numberOfProcessedImages: number, imagesToDownload: string[], options: any, next: () => void }} Task */

/** @type {Set<Task>} */
const tasks = new Set();

chrome.runtime.onMessage.addListener(startDownload);
chrome.downloads.onDeterminingFilename.addListener(suggestNewFilename);

// NOTE: Don't directly use an `async` function as a listener for `onMessage`:
// https://stackoverflow.com/a/56483156
// https://developer.chrome.com/docs/extensions/reference/runtime/#event-onMessage
function startDownload(
  /** @type {any} */ message,
  /** @type {chrome.runtime.MessageSender} */ sender,
  /** @type {(response?: any) => void} */ resolve
) {
  if (!(message && message.type === 'downloadImages')) return;

  downloadImages({
    numberOfProcessedImages: 0,
    imagesToDownload: message.imagesToDownload,
    options: message.options,
    next() {
      this.numberOfProcessedImages += 1;
      if (this.numberOfProcessedImages === this.imagesToDownload.length) {
        tasks.delete(this);
      }
    },
  }).then(resolve);

  return true; // Keeps the message channel open until `resolve` is called
}

async function downloadImages(/** @type {Task} */ task) {
  tasks.add(task);

  if (task.options.zip_download === 'true') {
    const files = [];
    for (const image of task.imagesToDownload) {
      try {
        const resp = await fetch(image);
        const buffer = await resp.arrayBuffer();
        const name = generatePath(task, image).split('/').pop();
        files.push({ name, buffer });
        task.next();
      } catch (error) {
        console.error(image, error);
        task.next();
      }
    }
    const site = getSite(task);
    const date = getDate();
    const zipBlob = await createZip(files);
    chrome.downloads.download({
      url: URL.createObjectURL(zipBlob),
      filename: normalizeSlashes(`QhromaLabs/${site}/${date}.zip`),
    });
  } else {
    for (const image of task.imagesToDownload) {
      await new Promise((resolve) => {
        chrome.downloads.download({ url: image }, (downloadId) => {
          if (downloadId == null) {
            if (chrome.runtime.lastError) {
              console.error(`${image}:`, chrome.runtime.lastError.message);
            }
            task.next();
          }
          resolve();
        });
      });
    }
  }
}

// https://developer.chrome.com/docs/extensions/reference/downloads/#event-onDeterminingFilename
/** @type {Parameters<chrome.downloads.DownloadDeterminingFilenameEvent['addListener']>[0]} */
function suggestNewFilename(item, suggest) {
  const task = [...tasks][0];
  if (!task) {
    suggest();
    return;
  }

  const path = generatePath(task, item.filename);
  suggest({ filename: normalizeSlashes(path) });
  task.next();
}

function normalizeSlashes(filename) {
  return filename.replace(/\\/g, '/').replace(/\/{2,}/g, '/');
}

function getSite(task) {
  try {
    const url = new URL(task.options.active_tab_origin);
    return url.hostname.replace(/^www\./, '').replace(/[^a-z0-9]/gi, '');
  } catch {
    return 'site';
  }
}

function getDate() {
  return new Date().toISOString().split('T')[0];
}

function generatePath(task, originalFilename) {
  const site = getSite(task);
  const date = getDate();
  const ext = (/\.([^.]+)$/.exec(originalFilename) || [null, 'jpg'])[1];
  const digits = task.imagesToDownload.length.toString().length;
  const index = String(task.numberOfProcessedImages + 1).padStart(digits, '0');
  const file = `${site}_${date}_${index}.${ext}`;
  return `QhromaLabs/${site}/${date}/${file}`;
}

async function createZip(files) {
  const parts = [];
  const central = [];
  const encoder = new TextEncoder();
  let offset = 0;
  for (const file of files) {
    const nameBytes = encoder.encode(file.name);
    const data = new Uint8Array(file.buffer);
    const crc = crc32(data);

    const local = new Uint8Array(30 + nameBytes.length);
    const view = new DataView(local.buffer);
    view.setUint32(0, 0x04034b50, true);
    view.setUint16(4, 20, true);
    view.setUint16(8, 0, true); // compression
    view.setUint16(10, 0, true); // mod time
    view.setUint16(12, 0, true); // mod date
    view.setUint32(14, crc, true);
    view.setUint32(18, data.length, true);
    view.setUint32(22, data.length, true);
    view.setUint16(26, nameBytes.length, true);
    local.set(nameBytes, 30);
    parts.push(local, data);

    const centralHeader = new Uint8Array(46 + nameBytes.length);
    const cview = new DataView(centralHeader.buffer);
    cview.setUint32(0, 0x02014b50, true);
    cview.setUint16(4, 20, true);
    cview.setUint16(6, 20, true);
    cview.setUint16(10, 0, true); // compression
    cview.setUint16(12, 0, true);
    cview.setUint16(14, 0, true);
    cview.setUint32(16, crc, true);
    cview.setUint32(20, data.length, true);
    cview.setUint32(24, data.length, true);
    cview.setUint16(28, nameBytes.length, true);
    cview.setUint32(42, offset, true);
    centralHeader.set(nameBytes, 46);
    central.push(centralHeader);

    offset += local.length + data.length;
  }

  const centralOffset = offset;
  for (const c of central) {
    parts.push(c);
    offset += c.length;
  }

  const end = new Uint8Array(22);
  const eview = new DataView(end.buffer);
  eview.setUint32(0, 0x06054b50, true);
  eview.setUint16(8, files.length, true);
  eview.setUint16(10, files.length, true);
  eview.setUint32(12, offset - centralOffset, true);
  eview.setUint32(16, centralOffset, true);
  parts.push(end);

  return new Blob(parts, { type: 'application/zip' });
}

const crcTable = (() => {
  const table = new Uint32Array(256);
  for (let i = 0; i < 256; i++) {
    let c = i;
    for (let k = 0; k < 8; k++) {
      c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    }
    table[i] = c >>> 0;
  }
  return table;
})();

function crc32(data) {
  let c = -1;
  for (let i = 0; i < data.length; i++) {
    c = (c >>> 8) ^ crcTable[(c ^ data[i]) & 0xff];
  }
  return (c ^ -1) >>> 0;
}
