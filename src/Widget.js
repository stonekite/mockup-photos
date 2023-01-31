import { h, Fragment } from "preact";
import { useEffect, useState, useCallback } from "preact/hooks";
import Dropzone from "react-dropzone";
import JSZip from "jszip";
import draw from "./draw";

const Widget = () => {
  const [counter, setCounter] = useState(0);
  const [errCounter, setErrCounter] = useState(0);
  const [allowRender, setAllowRender] = useState(false);
  const [allowDownload, setAllowDownload] = useState(false);
  const [showProgressBar, setShowProgressBar] = useState(false);
  const [previewUrls, setPreviewUrls] = useState();

  const [fgUrls, setFgUrls] = useState([]);
  const onFgDrop = useCallback((files) => {
    setFgUrls([
      ...fgUrls,
      ...files.map(file => URL.createObjectURL(file)),
    ]);
    setShowProgressBar(false);
    setAllowDownload(false);
  }, [fgUrls]);
  const removeFgUrlAt = useCallback((i) => {
    setFgUrls([
      ...fgUrls.slice(0, i),
      ...fgUrls.slice(i + 1),
    ]);
    setPreviewUrls([
      ...previewUrls.slice(0, i),
      ...previewUrls.slice(i + 1),
    ])
  }, [fgUrls, previewUrls]);

  const [bgUrls, setBgUrls] = useState([]);
  const onBgDrop = useCallback((files) => {
    setBgUrls([
      ...bgUrls,
      ...files.map(file => URL.createObjectURL(file)),
    ]);
    setShowProgressBar(false);
    setAllowDownload(false);
  }, [bgUrls]);
  const removeBgUrlAt = useCallback((i) => {
    setBgUrls([
      ...bgUrls.slice(0, i),
      ...bgUrls.slice(i + 1)
    ]);
    setPreviewUrls(previewUrls.map(row =>
      [...row.slice(0, i), row.slice(i + 1)])
    );
  }, [bgUrls, previewUrls]);

  useEffect(() => {
    setAllowRender(fgUrls.length && bgUrls.length);
    if (!fgUrls.length || !bgUrls.length) {
      setShowProgressBar(false);
      setAllowDownload(false);
    }
  }, [fgUrls, bgUrls]);

  const flipFg = (i, v) => {
    const url = fgUrls[i];
    const img = new Image();
    img.src = url;
    img.onload = () => {
      const canvas = document.createElement("canvas");
      canvas.width = img.naturalWidth;
      canvas.height = img.naturalHeight;
      const ctx = canvas.getContext("2d")
      if (v) {
        ctx.scale(1, -1);
        ctx.drawImage(img, 0, canvas.height * -1);
      } else {
        ctx.scale(-1, 1);
        ctx.drawImage(img, canvas.width * -1, 0);
      }
      canvas.toBlob((blob) => {
        const canvasUrl = URL.createObjectURL(blob);
        setFgUrls([
          ...fgUrls.slice(0, i),
          canvasUrl,
          ...fgUrls.slice(i + 1)
        ])
      });
    };
  };

  const render = async () => {
    const previewUrls = fgUrls.map(() => bgUrls.map(() => undefined));
    setPreviewUrls(previewUrls);
    if (!allowRender) {
      return;
    }
    let counter = 0, errCounter = 0;
    setCounter(0);
    setErrCounter(0);
    setShowProgressBar(true);
    setAllowDownload(false);
    const countUp = (success) => {
      if (success) {
        setCounter(++counter);
        setPreviewUrls(previewUrls);
      } else {
        setErrCounter(++errCounter)
      }
      if ((counter + errCounter) === fgUrls.length * bgUrls.length) {
        setAllowDownload(true);
      }
    }
    for (const [i, fgUrl] of fgUrls.entries()) {
      for (const [ii, bgUrl] of bgUrls.entries()) {
        previewUrls[i][ii] = await getDrawnIn(fgUrl, bgUrl)
          .catch((e) => {
            console.error(e);
            countUp(false);
          });
        countUp(true);
      }
    }
  };

  const download = () => {
    if (!allowDownload) {
      return;
    }
    Promise.all(previewUrls.map(row =>
      Promise.all(row.map(url =>
        fetch(url).then(r => r.blob())
      ))
    )).then(rows => {
      const zip = new JSZip();
      rows.forEach((row, i) => {
        const folder = zip.folder(i.toString());
        row.forEach((blob, ii) => {
          folder.file(`${i}_${ii}.png`, blob);
        });
      });
      zip.generateAsync({ type: "blob" }).then(blob => {
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `Mockups ${new Date().toISOString().slice(0, 19)}.zip`;
        a.click();
      })
    });
  };

  return (
    <>
      <div className="dropzone-container">
        <CustomDropzone
          onDrop={ onFgDrop }
          label="Photos"
          previewUrls={ fgUrls }
          removeAt={ removeFgUrlAt }
        />
        <CustomDropzone
          onDrop={ onBgDrop }
          label="Backgrounds"
          previewUrls={ bgUrls }
          removeAt={ removeBgUrlAt }
        />
      </div>
      <div className="inputs-container">
        <div
          className="progress-bar"
          style={ { opacity: showProgressBar ? 1 : 0 } }
        >
          {
            <div
              className="progress-bar-block"
              style={ {
                width: (100 * counter / fgUrls.length / bgUrls.length) + "%"
              } }
            />
          }
          {
            <div
              className="progress-bar-block"
              style={ {
                width: (100 * errCounter / fgUrls.length / bgUrls.length) + "%"
              } }
            />
          }
        </div>
        <button
          className={ `input ${ !allowDownload ? "hidden" : "" }` }
          onClick={ download }
        >
          Download
        </button>
        <button
          className={ `input ${ !allowRender ? "hidden" : "" }` }
          onClick={ render }
        >
          Render
        </button>
      </div>
      <div className="previews">
        {
          fgUrls.map((fgUrl, i) => (
            <div className="preview" key={ fgUrl }>
              <DynamicImg src={ fgUrl }>
                <XButton onClick={ () => removeFgUrlAt(i) } />
                <button
                  onClick={ e => { e.stopPropagation(); flipFg(i, true); } }
                >
                  Flip vertically
                </button>
                <button
                  onClick={ e => { e.stopPropagation(); flipFg(i, false); } }
                >
                  Flip horizontally
                </button>
              </DynamicImg>
              {
                bgUrls.map((bgUrl, ii) => {
                  const url = previewUrls?.[i]?.[ii];
                  return url &&
                    <DynamicImg src={ url } key={ bgUrl + url } />
                })
              }
            </div>
          ))
        }
      </div>
    </>
  );
};

const CustomDropzone = ({ onDrop, label, previewUrls, removeAt }) => {
  return (
    <Dropzone onDrop={ onDrop }>
      {
        ({ getRootProps, getInputProps }) => (
          <div { ...getRootProps({ className: "dropzone" }) }>
            <input { ...getInputProps() } />
            <h1>{ label }</h1>
            {
              previewUrls &&
              <div className="preview-dropzone">
                {
                  previewUrls.map((url, i) =>
                    <DynamicImg
                      src={ url }
                      onClick={ e => e.stopPropagation() }
                      key={ url }
                    >
                      <XButton
                        onClick={ e => { e.stopPropagation(); removeAt(i); } }
                      />
                    </DynamicImg>
                  )
                }
              </div>
            }
          </div>
        )
      }
    </Dropzone>
  );
};

const DynamicImg = ({ children, src, ...props }) => {
  const [showModal, setShowModal] = useState();
  const onClick = useCallback((e) => {
    props.onClick && props.onClick(e);
    setShowModal(!showModal);
  });
  const normalizedChildren = Array.isArray(children) ? children : [children];
  return (
    <>
      <div className="dynamic-img-container" { ...props } onClick={ onClick }>
        <div className="dynamic-img-wrapper">
          <img src={ src } />
          <div className="controls">
            {
              normalizedChildren
            }
          </div>
        </div>
      </div>
      {
        showModal &&
        <div className="dynamic-img-modal" onClick={ onClick }>
          <img src={ src } />
        </div>
      }
    </>
  )
};

const XButton = (props) => <button { ...props }>x</button>;

const getDrawnIn = (fgUrl, bgUrl) => {
  const fgImg = new Image();
  fgImg.src = fgUrl;
  const bgImg = new Image();
  bgImg.src = bgUrl;
  return new Promise(resolve => {
    const _draw = () => {
      const canvas = document.createElement("canvas");
      canvas.width = bgImg.naturalWidth;
      canvas.height = bgImg.naturalHeight;
      canvas.getContext("2d").drawImage(bgImg, 0, 0);
      const ok = draw(fgImg, canvas);
      if (ok) {
        canvas.toBlob((blob) => {
          const canvasUrl = URL.createObjectURL(blob);
          resolve(canvasUrl);
        });
      } else {
        resolve(null);
      }
    };
    let otherLoaded = false;
    const loadHandler = () => {
      if (otherLoaded) {
        _draw();
      } else {
        otherLoaded = true;
      }
    };
    fgImg.onload = loadHandler;
    bgImg.onload = loadHandler;
  });
};

export default Widget;
