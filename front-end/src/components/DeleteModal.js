// DeleteModal.js
import { X } from 'react-feather';

export default function DeleteModal({ open, onClose, children }) {
  return (
    <div
      onClick={onClose}
      className={`
        tw-fixed tw-inset-0 tw-z-50 tw-flex tw-items-center tw-justify-center tw-transition-colors
        ${open ? 'tw-visible tw-bg-black/50' : 'tw-invisible'}
      `}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className={`
          tw-bg-white tw-rounded-xl tw-shadow tw-p-6 tw-transition-all tw-relative
          ${open ? 'tw-scale-100 tw-opacity-100' : 'tw-scale-125 tw-opacity-0'}
        `}
      >
        <button
          onClick={onClose}
          className="tw-absolute tw-top-2 tw-right-2 tw-text-gray-400 tw-hover:text-gray-600"
        >
          <X />
        </button>
        {children}
      </div>
    </div>
  );
}
