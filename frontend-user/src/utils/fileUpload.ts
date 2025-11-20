export const simulateFileUpload = (
  setUploading: React.Dispatch<React.SetStateAction<boolean>>,
  setUploadProgress: React.Dispatch<React.SetStateAction<number>>,
) => {
  setUploading(true);
  setUploadProgress(0);

  const interval = setInterval(() => {
    setUploadProgress((prev) => {
      if (prev >= 100) {
        clearInterval(interval);
        setUploading(false);
        return 100;
      }
      return prev + 10;
    });
  }, 200);
};