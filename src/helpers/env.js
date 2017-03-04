const { platform, userAgent } = navigator;

export const macosx = /Mac/.test(platform);
export const webkit = /WebKit\//.test(userAgent);
export const gecko = /gecko\/\d/i.test(userAgent);
export const ie = /(MSIE \d|Trident\/)/.test(userAgent);
export const presto = /Opera\//.test(userAgent);
export const wheelUnit = webkit ? -1/3 : gecko ? 5 : ie ? -0.53 : presto ? -0.05 : -1;
