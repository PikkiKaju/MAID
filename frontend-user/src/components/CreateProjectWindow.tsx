interface CreateProjectWindowProps {
  isOpen: boolean;
  projectName: string;
  onChange: (value: string) => void;
  onClose: () => void;
  onConfirm: () => void;
}

function CreateProjectWindow({
  isOpen,
  projectName,
  onChange,
  onClose,
  onConfirm,
}: CreateProjectWindowProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center backdrop-blur-md bg-black/40">
      <div className="bg-white rounded-lg p-6 w-full max-w-md shadow-lg">
        <h2 className="text-xl font-semibold mb-4">Nazwa projektu</h2>
        <input
          type="text"
          placeholder="Wpisz nazwę projektu..."
          value={projectName}
          onChange={(e) => onChange(e.target.value)}
          className="w-full p-2 border rounded mb-4"
        />
        <div className="flex justify-end gap-2">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-gray-300 rounded hover:bg-gray-400"
          >
            Anuluj
          </button>
          <button
            onClick={onConfirm}
            disabled={projectName.length < 4}
            className={`px-4 py-2 rounded text-white ${
              projectName.length >= 4
                ? "bg-blue-600 hover:bg-blue-700"
                : "bg-blue-300 cursor-not-allowed"
            }`}
          >
            Przejdź dalej
          </button>
        </div>
      </div>
    </div>
  );
}

export default CreateProjectWindow;
