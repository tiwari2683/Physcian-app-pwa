import { AlertTriangle, X } from 'lucide-react';

interface SubscriptionExpiredModalProps {
  open: boolean;
  message: string;
  onClose: () => void;
}

export const SubscriptionExpiredModal = ({
  open,
  message,
  onClose,
}: SubscriptionExpiredModalProps) => {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[100] bg-black/50 flex items-center justify-center p-4">
      <div className="w-full max-w-md bg-white rounded-2xl border border-red-100 shadow-xl overflow-hidden">
        <div className="flex items-center justify-between px-5 py-4 border-b border-red-100 bg-red-50">
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-5 h-5 text-red-600" />
            <h3 className="text-base font-bold text-red-700">Subscription expired</h3>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-md hover:bg-red-100 text-red-600 transition-colors"
            aria-label="Close modal"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="px-5 py-4 space-y-3">
          <p className="text-sm text-gray-700 font-medium">
            {message || 'Your clinic subscription has expired. This action is currently blocked.'}
          </p>
          <p className="text-xs text-gray-500">
            Contact your platform administrator or SuperAdmin to renew the clinic subscription and restore write
            access.
          </p>
        </div>

        <div className="px-5 py-4 border-t border-gray-100 bg-gray-50 flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-lg bg-red-600 text-white text-sm font-semibold hover:bg-red-700 transition-colors"
          >
            OK
          </button>
        </div>
      </div>
    </div>
  );
};
