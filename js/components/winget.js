// /js/components/winget.js

// Import các tiện ích cần thiết
import { openModal, closeModal, showToast, escapeHtml, openGuideModal } from '../utils.js';

// Biến global cho module này
let copyTimeout;

/**
 * Hàm chính được export: Mở modal Winget
 * @param {Array<Object>} selectedApps - Danh sách các app winget đã chọn
 */
export function openWingetModal(selectedApps) {
    if (!selectedApps || selectedApps.length === 0) {
        return showToast('Chưa chọn phần mềm nào có loại là "Winget".', 'error');
    }

    const scriptContent = generateWingetScript(selectedApps);
    const highlightedHtml = highlightPowerShell(scriptContent);

    // [SỬA] Áp dụng token 'font-bold text-brand' (Đã chuẩn)
    const modalContent = `
        <h3 class="font-bold text-brand mb-4">🚀 WINGET POWERSHELL SCRIPT</h3>
        <pre id="powershellContainer" class="mt-4 border border-[var(--color-border)] rounded-lg"><code id="wingetScriptDisplay" class="language-powershell">${highlightedHtml}</code></pre>
        <div class="flex justify-between items-center mt-4">
            <span id="copyStatus" class="font-thin text-brand opacity-0 transition-opacity"></span>
            <div class="flex space-x-2">
                <button class="btn btn-secondary" id="copyWingetCommandsBtn">Lệnh Đơn (Winget)</button>
                <button class="btn btn-secondary" id="copyWingetScriptBtn">Toàn bộ Script (PS)</button>
                <button class="btn btn-main" id="exportWingetScriptBtn">Xuất File (.ps1)</button>
            </div>
        </div>`;
    // SỬA: Đổi border-gray-300 -> border-[var(--color-border)]

    openModal(modalContent, 'max-w-3xl');

    // **QUAN TRỌNG:** Gán listener ngay sau khi mở modal
    // Thay vì dùng listener toàn cục
    setupWingetModalHandlers(selectedApps);
}

/**
 * Gán listener cho các nút BÊN TRONG modal Winget
 * @param {Array<Object>} selectedApps 
 */
function setupWingetModalHandlers(selectedApps) {
    const commandsBtn = document.getElementById('copyWingetCommandsBtn');
    const scriptBtn = document.getElementById('copyWingetScriptBtn');
    const exportBtn = document.getElementById('exportWingetScriptBtn');

    // Dùng .onclick để đảm bảo chỉ có 1 listener (hoặc dùng addEventListener với { once: true })
    if (commandsBtn) commandsBtn.onclick = () => copySimpleWingetCommands(selectedApps);
    if (scriptBtn) scriptBtn.onclick = () => copyWingetScript();
    if (exportBtn) exportBtn.onclick = () => exportWingetScript();
}

// --- CÁC HÀM HỖ TRỢ (Nội bộ của module này) ---

function showExecutionPolicyGuide() {
    // SỬA: Đổi bg-gray-100 -> bg-background (token chuẩn)
    openGuideModal('HƯỚNG DẪN CHẠY WINGET',
        `Bạn vừa tải về file <strong>JulesStudio_Winget_Script.ps1</strong>. Chạy file nếu lỗi thì làm theo hướng dẫn sau:
        <ol class="list-decimal list-inside ml-4 space-y-1">
            <li>Mở PowerShell với quyền administrator.</li>
            <li>Gõ lệnh sau rồi Enter:</li>
            <li class="ml-4"><pre class="bg-background p-2 rounded"><code>Set-ExecutionPolicy RemoteSigned -Scope Process -Force</code></pre></li>
            <li>Click chuột phải vào file Chọn "Run with PowerShell".</li>
            <li>Script sẽ tự động chạy.</li>
        </ol>`);
}

function generateWingetScript(selectedApps) {
    const appCommands = selectedApps.map(s => s.link.trim());
    const template = `
# Kiem tra va cho phep ExecutionPolicy
$policy = Get-ExecutionPolicy
if ($policy -eq 'Restricted') {
    Write-Host "Dang cho phep chay script (ExecutionPolicy: RemoteSigned)" -ForegroundColor Yellow
    Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope Process -Force
}
# Kiem tra quyen Administrator va tu khoi dong lai neu can
if (-not ([Security.Principal.WindowsPrincipal] [Security.Principal.WindowsIdentity]::GetCurrent()).IsInRole([Security.Principal.WindowsBuiltInRole] "Administrator")) {
    Write-Host "Chua co quyen Administrator. Dang mo lai PowerShell voi quyen admin..." -ForegroundColor Yellow
    Start-Process powershell "-ExecutionPolicy Bypass -File \\\`"$PSCommandPath\\\`"" -Verb RunAs
    exit
}
# Kiem tra Microsoft Store (AppX)
$store = Get-AppxPackage -Name "Microsoft.WindowsStore" -ErrorAction SilentlyContinue
if (-not $store) {
    Write-Host "Microsoft Store chua hoat dong. Dang kich hoat lai..." -ForegroundColor Yellow
    Get-Service -Name "ClipSVC" -ErrorAction SilentlyContinue | Set-Service -StartupType Automatic
    Start-Service -Name "ClipSVC" -ErrorAction SilentlyContinue
}
# Kiem tra Desktop App Installer (winget)
if (-not (Get-AppxPackage -Name "Microsoft.DesktopAppInstaller" -ErrorAction SilentlyContinue)) {
    Write-Host "Winget chua duoc cai dat. Dang thu tai va cai tu Microsoft..." -ForegroundColor Yellow
    $url = "https://aka.ms/getwinget"
    $file = "$env:TEMP\\DesktopAppInstaller.msixbundle"
    try {
        Invoke-WebRequest -Uri $url -OutFile $file -UseBasicParsing
        Write-Host "Tai thanh cong goi cai dat. Dang cai..." -ForegroundColor Cyan
        Add-AppxPackage -Path $file
        Remove-Item $file -ErrorAction SilentlyContinue
        Write-Host "Cai dat thanh cong Winget!" -ForegroundColor Green
    } catch {
        Write-Host "Khong the tai hoac cai dat goi Desktop App Installer. Mo Microsoft Store de cai thu cong..." -ForegroundColor Red
        Start-Process "ms-windows-store://pdp/?productid=9NBLGGH4NNS1"
        Write-Host ""
        Write-Host "Sau khi cai xong, vui long dong cua so PowerShell nay va mo lai PowerShell moi." -ForegroundColor Cyan
        Pause
        exit
    }
}
Write-Host "\\\`nBat dau cai dat ${appCommands.length} ung dung... \\\`n" -ForegroundColor Cyan
${appCommands.map(cmd => `
Write-Host "Dang thuc hien: ${cmd}" -ForegroundColor Yellow
${cmd}
if ($LASTEXITCODE -eq 0) {
    Write-Host "[  OK  ] Thuc hien thanh cong" -ForegroundColor Green
} else {
    Write-Host "[ FAIL ] Thuc hien that bai: ${cmd}" -ForegroundColor Red
}
Write-Host ""
`).join('\n')}
Write-Host "\\\`nHoan tat cai dat!" -ForegroundColor Cyan
Pause
`;
    return template.trim();
}

// (Giữ nguyên hàm highlightPowerShell, các class ps-* là token, không phải utility)
function highlightPowerShell(text) {
    return escapeHtml(text).replace(/^(#.*)$/gm, '<span class="ps-comment">$1</span>')
        .replace(/(".*?")/g, '<span class="ps-string">$1</span>')
        .replace(/(\$[a-zA-Z0-9_]+)/g, '<span class="ps-variable">$1</span>')
        .replace(/\b(if|else|foreach|in|try|catch|function|return|exit|Pause|Write-Host|Get-ExecutionPolicy|Set-ExecutionPolicy|Start-Process|Get-AppxPackage|Get-Service|Set-Service|Start-Service|Invoke-WebRequest|Add-AppxPackage|Remove-Item|winget)\b/gi, '<span class="ps-command">$1</span>')
        .replace(/\b(Restricted|Yellow|Process|Force|Administrator|RunAs|SilentlyContinue|Automatic|Yellow|Cyan|Green|Red|Bypass|RemoteSigned)\b/gi, '<span class="ps-keyword">$1</span>')
        .replace(/(-eq|-not|-gt|-lt|-le|-ge|-like|-match)/g, '<span class="ps-operator">$1</span>');
}

function updateCopyStatus(message, elementId) {
    const status = document.getElementById(elementId);
    if (status) {
        status.textContent = message;
        status.style.opacity = '1';
    }
    if (copyTimeout) clearTimeout(copyTimeout);
    copyTimeout = setTimeout(() => {
        if (status) status.style.opacity = '0';
    }, 2000);
}

function copyWingetScript() {
    const scriptDisplay = document.getElementById('wingetScriptDisplay');
    if (!scriptDisplay) return;
    const scriptText = scriptDisplay.textContent || '';
    navigator.clipboard.writeText(scriptText).then(() => {
        updateCopyStatus('Đã copy Script!', 'copyStatus');
    }).catch(err => {
        showToast('Copy lỗi. Vui lòng copy thủ công.', 'error');
    });
}

function copySimpleWingetCommands(selectedApps) {
    if (selectedApps.length === 0) {
        showToast('Chưa chọn phần mềm Winget nào.', 'error');
        return;
    }
    const commands = selectedApps.map(s => s.link.trim()).join('\n');
    navigator.clipboard.writeText(commands).then(() => {
        updateCopyStatus('Đã copy Lệnh Đơn!', 'copyStatus');
    }).catch(err => {
        showToast('Copy lỗi. Vui lòng copy thủ công.', 'error');
    });
}

function exportWingetScript() {
    const scriptDisplay = document.getElementById('wingetScriptDisplay');
    if (!scriptDisplay) return;
    const scriptText = scriptDisplay.textContent || '';
    const blob = new Blob(["\uFEFF" + scriptText], { type: 'application/octet-stream' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = 'JulesStudio_Winget_Script.ps1';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(a.href);

    closeModal(); // Đóng modal winget
    showExecutionPolicyGuide(); // Mở modal hướng dẫn
}