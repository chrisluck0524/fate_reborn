$ErrorActionPreference = 'Stop'
$ProjectRoot = (Resolve-Path (Join-Path $PSScriptRoot '..')).Path

if (-not (Get-Command git -ErrorAction SilentlyContinue)) {
  Write-Host '未找到 Git。请使用 GitHub Desktop 的 Fetch origin / Pull origin 更新本项目。'
  exit 0
}

Push-Location $ProjectRoot
try {
  git pull --ff-only
  if ($LASTEXITCODE -ne 0) { throw '更新失败；请把窗口内容发给 Codex。' }
  Write-Host '源码已更新。双击“启动宿命.cmd”即可重新构建并试玩。'
}
finally {
  Pop-Location
}
