import { promises as fs } from 'node:fs';
import path from 'node:path';

const root = path.resolve(process.cwd());
const inputPath = path.join(root, 'admin.js');
const outDir = path.join(root, 'admin-src');

function mustFind(haystack, needle) {
  const idx = haystack.indexOf(needle);
  if (idx === -1) throw new Error(`Marker not found: ${needle}`);
  return idx;
}

function mustFindAfter(haystack, needle, afterIdx) {
  const idx = haystack.indexOf(needle, afterIdx);
  if (idx === -1) throw new Error(`Marker not found after ${afterIdx}: ${needle}`);
  return idx;
}

async function writePiece(relPath, content) {
  const absPath = path.join(outDir, relPath);
  await fs.mkdir(path.dirname(absPath), { recursive: true });
  const normalized = content.endsWith('\n') ? content : content + '\n';
  await fs.writeFile(absPath, normalized, 'utf8');
  return relPath.replace(/\\/g, '/');
}

async function main() {
  const src = await fs.readFile(inputPath, 'utf8');

  const mLogin = '    // ==================== LOGIN COMPONENT ====================';
  const mComponents = '    // ==================== COMPONENTS ====================';
  const mSidebar = '    // Sidebar';
  const mSettings = '    // ==================== ADMIN SETTINGS (LOCAL) ====================';
  const mAlbumList = '    function AlbumList(';
  const mAlbumModal = '    function AlbumModal(';
  const mFolderTreeItem = '    function FolderTreeItem(';
  const mAlbumDetail = '    function AlbumDetail(';
  const mSearch = '    // ==================== SEARCH CENTER - TRA CỨU NHANH ====================';
  const mVideo = '    // ==================== VIDEO MANAGEMENT ====================';
  const mVideoList = '    function VideoList(';
  const mVideoFolderModal = '    function VideoFolderModal(';
  const mProduct = '    // ==================== PRODUCT MANAGER ====================';
  const mProductManager = '    function ProductManager(';
  const mProductModalTop = '    function ProductModal(';
  const mVideoModal = '    function VideoModal(';
  const mMain = '    // ==================== MAIN APP ====================';
  const mOrderComment = '    // OrderManager component';

  const idxLogin = mustFind(src, mLogin);
  const idxComponents = mustFindAfter(src, mComponents, idxLogin);
  const idxSidebar = mustFindAfter(src, mSidebar, idxComponents);
  const idxSettings = mustFindAfter(src, mSettings, idxSidebar);

  const idxAlbumList = mustFindAfter(src, mAlbumList, idxSettings);
  const idxAlbumModal = mustFindAfter(src, mAlbumModal, idxAlbumList);
  const idxFolderTreeItem = mustFindAfter(src, mFolderTreeItem, idxAlbumModal);
  const idxAlbumDetail = mustFindAfter(src, mAlbumDetail, idxFolderTreeItem);

  const idxSearch = mustFindAfter(src, mSearch, idxAlbumDetail);
  const idxVideo = mustFindAfter(src, mVideo, idxSearch);

  const idxVideoList = mustFindAfter(src, mVideoList, idxVideo);
  const idxVideoFolderModal = mustFindAfter(src, mVideoFolderModal, idxVideoList);

  const idxProduct = mustFindAfter(src, mProduct, idxVideo);
  const idxProductManager = mustFindAfter(src, mProductManager, idxProduct);
  const idxProductModalTop = mustFindAfter(src, `\n${mProductModalTop}`, idxProductManager);
  const idxVideoModal = mustFindAfter(src, mVideoModal, idxProductModalTop);

  const idxMain = mustFindAfter(src, mMain, idxVideoModal);
  const idxOrderComment = mustFindAfter(src, mOrderComment, idxMain);

  const pieces = [];
  pieces.push(await writePiece('00-globals.js', src.slice(0, idxLogin)));
  pieces.push(await writePiece('01-login.js', src.slice(idxLogin, idxComponents)));
  pieces.push(await writePiece('02-ui-components.js', src.slice(idxComponents, idxSidebar)));
  pieces.push(await writePiece('03-sidebar.js', src.slice(idxSidebar, idxSettings)));
  pieces.push(await writePiece('04-settings.js', src.slice(idxSettings, idxAlbumList)));
  pieces.push(await writePiece('05-album-list.js', src.slice(idxAlbumList, idxAlbumModal)));
  pieces.push(await writePiece('06-album-modal.js', src.slice(idxAlbumModal, idxFolderTreeItem)));
  pieces.push(await writePiece('07-folder-tree-item.js', src.slice(idxFolderTreeItem, idxAlbumDetail)));
  pieces.push(await writePiece('08-album-detail.js', src.slice(idxAlbumDetail, idxSearch)));
  pieces.push(await writePiece('09-search-center.js', src.slice(idxSearch, idxVideo)));
  pieces.push(await writePiece('10-video-list.js', src.slice(idxVideo, idxVideoFolderModal)));
  pieces.push(await writePiece('11-video-folder-modal.js', src.slice(idxVideoFolderModal, idxProduct)));
  pieces.push(await writePiece('12-product-manager.js', src.slice(idxProduct, idxProductModalTop)));
  pieces.push(await writePiece('13-product-modal.js', src.slice(idxProductModalTop, idxVideoModal)));
  pieces.push(await writePiece('14-video-modal.js', src.slice(idxVideoModal, idxMain)));
  pieces.push(await writePiece('15-main-app.js', src.slice(idxMain, idxOrderComment)));
  pieces.push(await writePiece('16-order-manager.js', src.slice(idxOrderComment)));

  await fs.writeFile(path.join(outDir, 'manifest.json'), JSON.stringify(pieces, null, 2) + '\n', 'utf8');
  process.stdout.write(`Wrote ${pieces.length} pieces to admin-src/manifest.json\n`);
}

main().catch((err) => {
  console.error(err);
  process.exitCode = 1;
});
