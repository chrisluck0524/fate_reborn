$ErrorActionPreference = 'Stop'
$ProjectRoot = (Resolve-Path (Join-Path $PSScriptRoot '..')).Path
$RuntimeRoot = Join-Path $ProjectRoot '.runtime'
$NodeRoot = Join-Path $RuntimeRoot 'node'
$NodeExe = Join-Path $NodeRoot 'node.exe'
$PnpmRoot = Join-Path $RuntimeRoot 'pnpm'
$PnpmCli = Join-Path $PnpmRoot 'node_modules\pnpm\bin\pnpm.cjs'
$EngineRoot = Join-Path $RuntimeRoot 'noname-engine'
$EngineRevision = '976d5efb0e568c3e7babbcd86af89b1d0126da2c'

New-Item -ItemType Directory -Force -Path $RuntimeRoot | Out-Null

if (-not (Test-Path $NodeExe)) {
  Write-Host '正在下载 Node.js 运行环境（仅首次需要）…'
  $release = Invoke-RestMethod 'https://nodejs.org/dist/index.json' |
    Where-Object { $_.lts -and $_.files -contains 'win-x64-zip' } |
    Select-Object -First 1
  if (-not $release) { throw '未找到可用的 Windows x64 Node.js 版本。' }
  $nodeZip = Join-Path $RuntimeRoot 'node.zip'
  Invoke-WebRequest "https://nodejs.org/dist/$($release.version)/node-$($release.version)-win-x64.zip" -OutFile $nodeZip
  Expand-Archive -Path $nodeZip -DestinationPath $RuntimeRoot -Force
  Move-Item (Join-Path $RuntimeRoot "node-$($release.version)-win-x64") $NodeRoot
  Remove-Item $nodeZip
}

if (-not (Test-Path $PnpmCli)) {
  Write-Host '正在准备构建工具（仅首次需要）…'
  & (Join-Path $NodeRoot 'npm.cmd') install --prefix $PnpmRoot pnpm@10
  if ($LASTEXITCODE -ne 0) { throw 'pnpm 安装失败。' }
}

if (-not (Test-Path (Join-Path $EngineRoot 'package.json'))) {
  Write-Host '正在下载无名杀引擎源码（仅首次需要）…'
  $engineZip = Join-Path $RuntimeRoot 'noname-engine.zip'
  Invoke-WebRequest "https://github.com/libnoname/noname/archive/$EngineRevision.zip" -OutFile $engineZip
  Expand-Archive -Path $engineZip -DestinationPath $RuntimeRoot -Force
  $extractedEngine = Get-ChildItem -Path $RuntimeRoot -Directory | Where-Object { $_.Name -like 'noname-*' } | Select-Object -First 1
  if (-not $extractedEngine) { throw '无名杀源码解压失败。' }
  Move-Item $extractedEngine.FullName $EngineRoot
  Remove-Item $engineZip
}

function Find-Git {
  $git = Get-Command git -ErrorAction SilentlyContinue
  if ($git) { return $git.Source }
  $desktopGit = Get-ChildItem "$env:LOCALAPPDATA\GitHubDesktop" -Recurse -Filter git.exe -ErrorAction SilentlyContinue |
    Select-Object -First 1
  if ($desktopGit) { return $desktopGit.FullName }
  return $null
}

if (-not (Test-Path (Join-Path $EngineRoot '.fate-patch-applied'))) {
  $git = Find-Git
  if ($git) {
    Write-Host '正在应用宿命客户端外观与启动补丁…'
    & $git -C $EngineRoot apply (Join-Path $ProjectRoot 'engine-patches\noname-engine-customizations.patch')
    if ($LASTEXITCODE -ne 0) { throw '无名杀引擎补丁未能应用。' }
    New-Item -ItemType File -Path (Join-Path $EngineRoot '.fate-patch-applied') | Out-Null
  }
  else {
    Write-Warning '未找到 Git；将继续构建，但不会应用客户端外观补丁。请安装 GitHub Desktop 后重新初始化。'
  }
}

Write-Host '正在同步宿命扩展源码…'
$extensionSource = Join-Path $ProjectRoot 'fate-reborn-extension'
$extensionTarget = Join-Path $EngineRoot 'packages\extension\fate-reborn'
if (Test-Path $extensionTarget) { Remove-Item -Recurse -Force $extensionTarget }
Copy-Item -Recurse -Force $extensionSource $extensionTarget

Write-Host '正在安装引擎依赖（仅首次可能需要数分钟）…'
& $NodeExe $PnpmCli --dir $EngineRoot install --frozen-lockfile
if ($LASTEXITCODE -ne 0) { throw '无名杀依赖安装失败。' }

Write-Host '正在构建宿命扩展…'
& $NodeExe $PnpmCli --dir $EngineRoot --filter @noname-extension/fate-reborn build
if ($LASTEXITCODE -ne 0) { throw '宿命扩展构建失败。' }

Write-Host '宿命已准备完成。'
