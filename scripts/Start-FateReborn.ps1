$ErrorActionPreference = 'Stop'
$ProjectRoot = (Resolve-Path (Join-Path $PSScriptRoot '..')).Path
$RuntimeRoot = Join-Path $ProjectRoot '.runtime'
$NodeExe = Join-Path $RuntimeRoot 'node\node.exe'
$PnpmCli = Join-Path $RuntimeRoot 'pnpm\node_modules\pnpm\bin\pnpm.cjs'
$EngineRoot = Join-Path $RuntimeRoot 'noname-engine'

if (-not (Test-Path $NodeExe) -or -not (Test-Path $EngineRoot)) {
  & (Join-Path $ProjectRoot '初始化宿命.cmd')
  exit $LASTEXITCODE
}

Copy-Item -Recurse -Force (Join-Path $ProjectRoot 'fate-reborn-extension\*') (Join-Path $EngineRoot 'packages\extension\fate-reborn')
& $NodeExe $PnpmCli --dir $EngineRoot --filter @noname-extension/fate-reborn build
if ($LASTEXITCODE -ne 0) { throw '构建失败。' }

Write-Host '正在启动宿命 Reborn。浏览器将自动打开。'
Start-Process -FilePath $NodeExe -ArgumentList @($PnpmCli, '--dir', $EngineRoot, 'start') -WorkingDirectory $EngineRoot
