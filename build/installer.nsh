!include "WordFunc.nsh"
!insertmacro VersionCompare

!macro customHeader
!macroend

!macro customInit
  # 1. 尝试从注册表读取当前机器已安装的版本号
  ReadRegStr $R0 SHELL_CONTEXT "${UNINSTALL_REGISTRY_KEY}" "DisplayVersion"
  ${if} $R0 == ""
    ReadRegStr $R0 HKCU "${UNINSTALL_REGISTRY_KEY}" "DisplayVersion"
  ${endif}
  ${if} $R0 == ""
    ReadRegStr $R0 HKLM "${UNINSTALL_REGISTRY_KEY}" "DisplayVersion"
  ${endif}

  # 2. 如果存在已安装版本，进行版本比较
  ${if} $R0 != ""
    # 对比当前安装包版本与已安装版本
    # $R1 返回值:
    # 0 = 版本相同
    # 1 = 安装包版本 > 已安装版本 (新版本升级)
    # 2 = 安装包版本 < 已安装版本 (降级)
    ${VersionCompare} "${VERSION}" "$R0" $R1

    ${if} $R1 == 2
      # 安装包版本号小于当前已安装版本时，提示并退出安装
      MessageBox MB_ICONSTOP|MB_OK "当前机器已安装更高版本 ($R0)。$\r$\n$\r$\n安装包版本 (${VERSION}) 无法降级安装。$\r$\n安装程序即将退出。"
      Quit
    ${else}
      # 新版本升级或同版本覆盖：先关闭已运行程序 (严禁加 /T，避免杀掉安装包自身进程树)
      nsExec::Exec 'taskkill /F /IM "${APP_EXECUTABLE_FILENAME}"'
      Sleep 800
    ${endif}
  ${endif}
!macroend

# 在安装执行阶段确保已运行程序被自动关闭，以便静默卸载旧版本并安装新版本
!macro customCheckAppRunning
  nsExec::Exec 'taskkill /F /IM "${APP_EXECUTABLE_FILENAME}"'
  Sleep 500
!macroend

