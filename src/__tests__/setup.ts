// jsdom doesn't implement <dialog>'s imperative methods (showModal/close) yet — only the plain
// `open` attribute/property. Polyfill just enough for components built on the native element
// (ModalDialog.vue) to be mountable in tests; real browsers already have the genuine behaviour.
if (typeof HTMLDialogElement !== 'undefined' && !HTMLDialogElement.prototype.showModal) {
  HTMLDialogElement.prototype.showModal = function (this: HTMLDialogElement) {
    this.setAttribute('open', '')
  }
  HTMLDialogElement.prototype.close = function (this: HTMLDialogElement) {
    this.removeAttribute('open')
    this.dispatchEvent(new Event('close'))
  }
}
