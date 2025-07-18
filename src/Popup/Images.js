import html, { useEffect, useMemo } from '../html.js';

import { Checkbox } from '../components/Checkbox.js';
import { isIncludedIn, isNotStrictEqual, stopPropagation } from '../utils.js';

import {
  DownloadImageButton,
  ImageUrlTextbox,
  OpenImageButton,
} from './ImageActions.js';

export const Images = ({
  options,
  visibleImages,
  selectedImages,
  imagesToDownload,
  setSelectedImages,
  style,
  ...props
}) => {
  const containerStyle = useMemo(() => {
    const width = parseInt(options.image_max_width, 10);
    return {
      gridTemplateColumns: `repeat(auto-fill, minmax(${width}px, 1fr))`,
      width: '100%',
      ...style,
    };
  }, [options.image_max_width, style]);

  // Fix weird flexbox bug where the parent does not respect the child's width
  // https://github.com/PactInteractive/image-downloader/issues/114#issuecomment-1715716846
  useEffect(() => {
    document.querySelector('main').style.minWidth = '100%';
  }, []);

  const showImageUrl = useMemo(() => options.show_image_url === 'true', [
    options.show_image_url,
  ]);

  const showOpenImageButton = useMemo(
    () => options.show_open_image_button === 'true',
    [options.show_open_image_button]
  );

  const showDownloadImageButton = useMemo(
    () => options.show_download_image_button === 'true',
    [options.show_download_image_button]
  );

  const someImagesAreSelected = useMemo(
    () =>
      visibleImages.length > 0 &&
      visibleImages.some(isIncludedIn(selectedImages)),
    [visibleImages, selectedImages]
  );

  const allImagesAreSelected = useMemo(
    () =>
      visibleImages.length > 0 &&
      visibleImages.every(isIncludedIn(selectedImages)),
    [visibleImages, selectedImages]
  );

  return html`
    <div id="images_container" style=${containerStyle} ...${props}>
      <${Checkbox}
        class="select_all_checkbox"
        checked=${allImagesAreSelected}
        indeterminate=${someImagesAreSelected && !allImagesAreSelected}
        onChange=${({ currentTarget: { checked } }) => {
      setSelectedImages(checked ? visibleImages : []);
    }}
      >
        Select all (${imagesToDownload.length} / ${visibleImages.length})
      <//>

      ${visibleImages.map(
      (imageUrl, index) => html`
          <div
            id=${`card_${index}`}
            class="card ${selectedImages.includes(imageUrl) ? 'checked' : ''}"
            style=${{ minHeight: `${options.image_max_width}px` }}
            onClick=${() => {
              setSelectedImages((selectedImages) =>
                selectedImages.includes(imageUrl)
                  ? selectedImages.filter(isNotStrictEqual(imageUrl))
                  : [...selectedImages, imageUrl]
              );
            }}
          >
            <img
              src=${imageUrl}
              style=${{
                minWidth: `${options.image_min_width}px`,
                maxWidth: `${options.image_max_width}px`,
              }}
            />

            <div class="checkbox"></div>

            ${(showOpenImageButton || showDownloadImageButton) && html`
              <div class="actions">
                ${showOpenImageButton && html`
                  <${OpenImageButton}
                    imageUrl=${imageUrl}
                    onClick=${stopPropagation}
                  />
                `}
                ${showDownloadImageButton && html`
                  <${DownloadImageButton}
                    imageUrl=${imageUrl}
                    options=${options}
                    onClick=${stopPropagation}
                  />
                `}
              </div>
            `}
            ${showImageUrl && html`
              <div class="image_url_container">
                <${ImageUrlTextbox}
                  value=${imageUrl}
                  onClick=${stopPropagation}
                />
              </div>
            `}
          </div>
        `
    )}
    </div>
  `;
};
