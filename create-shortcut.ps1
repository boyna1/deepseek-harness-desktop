# 在桌面创建 DeepSeek Harness 快捷方式
# 用法（PowerShell）: powershell -NoProfile -ExecutionPolicy Bypass -File create-shortcut.ps1

$desktop = [Environment]::GetFolderPath('Desktop')
$shortcutPath = Join-Path $desktop 'DeepSeek Harness.lnk'
$appDir = Join-Path $env:USERPROFILE '.dsh\desktop'
$target = Join-Path $appDir 'node_modules\electron\dist\electron.exe'
$arguments = '"' + (Join-Path $appDir 'main.js') + '"'
$workingDir = $appDir

$ws = New-Object -ComObject WScript.Shell
$sc = $ws.CreateShortcut($shortcutPath)
$sc.TargetPath = $target
$sc.Arguments = $arguments
$sc.WorkingDirectory = $workingDir
$sc.IconLocation = "$target,0"
$sc.Description = 'DeepSeek Harness Desktop'
$sc.Save()

Write-Output "Shortcut created: $shortcutPath"
