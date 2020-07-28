import RNFetchBlob from 'rn-fetch-blob';

export default {
  getNetworkSpeed: function (url, offPath, signal) {
    const unlink = () =>
      RNFetchBlob.fs.unlink(`${offPath}/networkSpeed`).catch(() => {});
    return new Promise((res, rej) => {
      let start, end;
      try {
        signal.addEventListener('abort', () => {
          task.cancel(err => {});
          res({ aborted: true });
        });
        let task = RNFetchBlob.config({
          path: `${offPath}/networkSpeed`
        }).fetch('GET', url);
        task
          .progress({ count: 10000 }, received => {
            if (!start) start = new Date();
            if (received > 512000) {
              end = new Date();
              task.cancel(err => {});
              unlink();
              let mbps = (received * 8) / 1024 / 1024 / ((end - start) / 1000);

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
                    : 2160
              });
            }
          })
          .catch(unlink);
      } catch (e) {
        unlink();
      }
    });
  }
};
