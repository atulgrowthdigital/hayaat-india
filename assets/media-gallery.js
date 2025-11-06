import { Component } from '@theme/component';
import { ThemeEvents, VariantUpdateEvent, ZoomMediaSelectedEvent } from '@theme/events';

/**
 * A custom element that renders a media gallery.
 *
 * @typedef {object} Refs
 * @property {import('./zoom-dialog').ZoomDialog} [zoomDialogComponent] - The zoom dialog component.
 * @property {import('./slideshow').Slideshow} [slideshow] - The slideshow component.
 * @property {HTMLElement[]} [media] - The media elements.
 *
 * @extends Component<Refs>
 */
export class MediaGallery extends Component {
  /**
   * Extract human-readable variant option values from the event resource.
   * @param {any} res
   * @returns {string[]}
   */
  static extractVariantValues(res) {
    if (!res) return [];
    const values = [];
    if (Array.isArray(res.selected_options)) {
      /** @type {(opt: any) => void} */
      const pushOpt = function (opt) {
        if (opt && opt.value) values.push(String(opt.value));
      };
      res.selected_options.forEach(pushOpt);
    }
    ['option1', 'option2', 'option3'].forEach(function (k) {
      if (res[k]) values.push(String(res[k]));
    });
    if (values.length === 0 && res.title) {
      const titleParts = String(res.title).split(' / ');
      if (titleParts.length) values.push(titleParts[0]);
    }
    /** @type {string[]} */
    const out = [];
    for (let i = 0; i < values.length; i++) {
      const v = values[i];
      if (!v) continue;
      const s = String(v).trim().toLowerCase();
      if (s.length) out.push(s);
    }
    return out;
  }

  connectedCallback() {
    super.connectedCallback();

    const { signal } = this.#controller;
    const target = this.closest('.shopify-section, dialog');

    target?.addEventListener(ThemeEvents.variantUpdate, this.#handleVariantUpdate, { signal });
    this.refs.zoomDialogComponent?.addEventListener(ThemeEvents.zoomMediaSelected, this.#handleZoomMediaSelected, {
      signal,
    });

    // On initial load, filter images by selected variant
    let variantResource = null;
    /** @type {any} */
    const win = window;
    if (win.ProductData && win.ProductData.selected_or_first_available_variant) {
      variantResource = win.ProductData.selected_or_first_available_variant;
    }
    if (!variantResource && this.dataset.selectedVariant) {
      try {
        variantResource = JSON.parse(this.dataset.selectedVariant);
      } catch {}
    }
    if (variantResource) {
      this.filterSlidesByVariant(variantResource);
    }
  }

  /**
   * Filter gallery slides in place by variant option values
   * @param {any} variantResource
   */
filterSlidesByVariant(variantResource) {
  const variantValues = MediaGallery.extractVariantValues(variantResource);
  console.log('🎨 Selected Variant Values:', variantValues);

  if (!variantValues.length) return;

  const slideContainers = Array.from(this.querySelectorAll('.product-media-container'));
  slideContainers.forEach((container, index) => {
    const img = container.querySelector('img');
    if (!img) return;

    const alt = (img.getAttribute('alt') || '').toLowerCase().trim();

    // Flatten all variant values into one string (for multi-word variants like “Muted Purple Blue”)
    const variantString = variantValues.join(' ').toLowerCase();

    // Match if alt text contains any word or the full variant phrase
    const matches =
      alt.includes(variantString) ||
      variantValues.some((val) => alt.includes(val));

    console.log(
      `🖼️ Image ${index + 1}: alt="${alt}" | Variant="${variantString}" | Match: ${matches}`
    );

    const el = /** @type {HTMLElement} */ (container);
    if (!matches) {
      el.style.display = 'none';
      console.log('❌ Hidden:', alt);
    } else {
      el.style.display = '';
      console.log('✅ Visible:', alt);
    }
  });
}


  #controller = new AbortController();

  disconnectedCallback() {
    super.disconnectedCallback();

    this.#controller.abort();
  }

  /**
   * Handles a variant update event by replacing the current media gallery with a new one.
   *
   * @param {VariantUpdateEvent} event - The variant update event.
   */
  #handleVariantUpdate = (event) => {
    const resource = event.detail.resource || null;
    if (resource) {
      this.filterSlidesByVariant(resource);
    }
  };

  /**
   * Handles the 'zoom-media:selected' event.
   * @param {ZoomMediaSelectedEvent} event - The zoom-media:selected event.
   */
  #handleZoomMediaSelected = async (event) => {
    this.slideshow?.select(event.detail.index, undefined, { animate: false });
  };

  /**
   * Zooms the media gallery.
   *
   * @param {number} index - The index of the media to zoom.
   * @param {PointerEvent} event - The pointer event.
   */
  zoom(index, event) {
    this.refs.zoomDialogComponent?.open(index, event);
  }

  get slideshow() {
    return this.refs.slideshow;
  }

  get media() {
    return this.refs.media;
  }

  get presentation() {
    return this.dataset.presentation;
  }
}

if (!customElements.get('media-gallery')) {
  customElements.define('media-gallery', MediaGallery);
}
