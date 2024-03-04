import ReactNativeBlobUtil from 'react-native-blob-util';

export default {
  getNetworkSpeed: function (
    url: string,
    offPath: any,
    signal: { addEventListener: (arg0: string, arg1: () => void) => void }
  ) {
    const unlink = (): Promise<void> =>
      ReactNativeBlobUtil.fs.unlink(`${offPath}/networkSpeed`).catch(() => {});
    return new Promise(res => {
      let start: number | Date;
      let end;
      try {
        signal?.addEventListener('abort', () => {
          task.cancel(() => {});
          res({ aborted: true });
        });
        const task = ReactNativeBlobUtil.config({
          path: `${offPath}/networkSpeed`,
        }).fetch('GET', url);
        task
          .progress({ count: 10000 }, received => {
            if (!start) {
              start = new Date();
            }
            if (received > 512000) {
              end = new Date();
              task.cancel(() => {});
              unlink();
              const mbps = (received * 8) / 1024 / 1024 / ((Number(end) - Number(start)) / 1000);

              res({
                mbps,
                recommendedVideoQuality:
                  mbps < 3
                    ? 360
                    : mbps < 5
                      ? 540
                      : mbps < 7
                        ? 720
                        : mbps < 12
                          ? 1080
                          : mbps < 22
                            ? 1440
                            : 2160,
              });
            }
          })
          .catch(unlink);
      } catch (e) {
        unlink();
      }
    });
  },
};
