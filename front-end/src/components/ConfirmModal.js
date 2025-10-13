/* eslint-disable prettier/prettier */
import { X } from 'react-feather';

export const ConfirmModal = ({
    open,
    onClose,
    title,
    message,
    icon = null, // optional icon or ReactNode
    confirmLabel = 'Confirm',
    cancelLabel = 'Cancel',
    onConfirm,
    confirmVariant = 'danger', // or "primary", "warning", etc.
}) => {
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
                    className="tw-absolute tw-top-2 tw-right-2 tw-text-gray-400 tw-hover:tw-text-gray-600"
                >
                    <X />
                </button>

                <div className="tw-text-center tw-w-56">
                    {icon && <div className="tw-mb-4 tw-flex tw-justify-center">{icon}</div>}
                    <div className="tw-mx-auto tw-my-4 tw-w-48">
                        <h3 className="tw-text-lg tw-font-black tw-text-gray-800">{title}</h3>
                        {message && <p className="tw-text-sm tw-text-gray-500">{message}</p>}
                    </div>

                    <div className="tw-flex tw-gap-4">
                        <button
                            className={`btn btn-${confirmVariant} tw-w-full`}
                            onClick={onConfirm}
                        >
                            {confirmLabel}
                        </button>
                        <button className="btn btn-light tw-w-full" onClick={onClose}>
                            {cancelLabel}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}
