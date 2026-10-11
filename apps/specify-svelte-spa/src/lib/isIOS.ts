export function isIOS() {
  const userAgent =
    window.navigator.userAgent || window.navigator.vendor;
  const platform = navigator.platform;

  // Дополнительная проверка на платформу
  const iosPlatforms = ["iPhone", "iPad", "iPod"];

  return /iPad|iPhone|iPod/.test(userAgent) || iosPlatforms.includes(platform);
}
