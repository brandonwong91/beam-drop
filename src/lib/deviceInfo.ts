export interface UserDeviceInfo {
  name: string;
  browser: string;
  os: string;
}

export function getDeviceInfo(): UserDeviceInfo {
  const ua = navigator.userAgent;
  let os = 'Unknown OS';
  let browser = 'Unknown Browser';

  if (/iPhone|iPad|iPod/i.test(ua)) {
    os = 'iOS Device';
  } else if (/Android/i.test(ua)) {
    os = 'Android Device';
  } else if (/Macintosh|Mac OS X/i.test(ua)) {
    os = 'macOS';
  } else if (/Windows NT/i.test(ua)) {
    os = 'Windows PC';
  } else if (/Linux/i.test(ua)) {
    os = 'Linux PC';
  }

  if (/Chrome/i.test(ua) && !/Edg/i.test(ua) && !/OPR/i.test(ua)) {
    browser = 'Chrome';
  } else if (/Safari/i.test(ua) && !/Chrome/i.test(ua)) {
    browser = 'Safari';
  } else if (/Firefox/i.test(ua)) {
    browser = 'Firefox';
  } else if (/Edg/i.test(ua)) {
    browser = 'Edge';
  } else if (/OPR|Opera/i.test(ua)) {
    browser = 'Opera';
  }

  // Friendly name like "MacBook Pro (Chrome)" or "iPhone (Safari)"
  const name = `${os} (${browser})`;

  return {
    name,
    browser,
    os,
  };
}
