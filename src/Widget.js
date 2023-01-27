import { h } from "preact";
import { useEffect, useState, useCallback } from "preact/hooks";
import Dropzone from "react-dropzone";
import draw from "./draw";

const Widget = () => {
  const [bgUrls, setBgUrls] = useState([]);
  const onBgDrop = useCallback((files) => {
    setBgUrls(files.map(file => URL.createObjectURL(file)));
  }, []);
  const drawCanvases = () => {
    for (const [bgUrl, i] of bgUrls.entries()) {
      const img = new Image();
      img.src = bgUrl;
      img.onload = () => {
        canvasRefs[i].width = img.naturalWidth;
        canvasRefs[i].height = img.naturalHeight;
        canvasRefs[i].getContext("2d").drawImage(img, 0, 0);
      };
    }
  }

  const [fgUrls, setFgUrls] = useState([]);
  const onFgDrop = useCallback((files) => {
    setFgUrls(files.map(file => URL.createObjectURL(file)));
  }, []);

  useEffect(() => {
    if (!bgUrls?.length || !fgUrls?.length) {
      return;
    }
    for (const fgUrl of fgUrls) {
      const fgImg = new Image();
      fgImg.src = fgUrl;
      fgImg.onload = () => {
        for (const bgUrl of bgUrls) {
          const bgImg = new Image();
          bgImg.src = bgUrl;
          bgImg.onload = () => {
            const canvas = document.createElement("canvas");
            canvas.width = bgImg.naturalWidth;
            canvas.height = bgImg.naturalHeight;
            canvas.getContext("2d").drawImage(bgImg, 0, 0);
            draw(fgImg, canvas);
            const a = document.createElement("a");
            canvas.toBlob(function(blob) {
              const canvasUrl = URL.createObjectURL(blob);
              a.setAttribute("href", canvasUrl);
              a.setAttribute("download", Date.now() + ".png");
              a.click();
            });
          };
        }
      };
      drawCanvases();
    }
  }, [bgUrls, fgUrls]);
  return (
    <div style={ styles.container }>
      <Dropzone onDrop={ onBgDrop }>
        {
          ({ getRootProps, getInputProps }) => (
            <div { ...getRootProps({ style: styles.dropzone }) }>
              <input { ...getInputProps() } />
              <p>Фоны</p>
              <div style={ styles.preview }>
                {
                  bgUrls.map(url => <img src={ url } key={ url } style={ styles.previewImg } />)
                }
              </div>
            </div>
          )
        }
      </Dropzone>
      <Dropzone onDrop={ onFgDrop }>
        {
          ({ getRootProps, getInputProps }) => (
            <div { ...getRootProps({ style: styles.dropzone }) }>
              <input { ...getInputProps() } />
              <p>Фотографии</p>
            </div>
          )
        }
      </Dropzone>
    </div>
  );
}
const styles = {
  container: {
    display: "flex",
    flexDirection: "row",
    justifyContent: "space-evenly",
  },
  dropzone: {
    width: "30rem",
    height: "30rem",
    border: "1px dashed black",
    display: "flex",
    flexDirection: "column",
    justifyContent: "center",
    alignItems: "center",
  },
  preview: {
    maxWidth: "100%",
  },
  previewImg: {
    height: "5rem",
    width: "5rem",
  },
};

export default Widget;