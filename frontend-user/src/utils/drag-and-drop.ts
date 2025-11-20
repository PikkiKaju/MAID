export const handleDrag =
  (setDragActive: React.Dispatch<React.SetStateAction<boolean>>) =>
  (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

export const handleDrop =
  (
    setDragActive: React.Dispatch<React.SetStateAction<boolean>>,
    handleFileUpload: (files: FileList) => void,
  ) =>
  (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    const files = e.dataTransfer.files;
    if (files && files.length > 0) {
      handleFileUpload(files);
    }
  };