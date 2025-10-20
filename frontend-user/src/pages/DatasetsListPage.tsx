import { useState } from "react";
import { attachedDatasets } from "../data";
import AttachedDatasets from "../components/datasets/AttachedDatasets";
import Tips from "../components/datasets/Tips";
import UploadArea from "../components/datasets/UploadArea";
import HeaderDatasets from "../components/datasets/HeaderDatasets";
import { handleDrag, handleDrop } from "../utilis/drag-and-drop";
import { simulateFileUpload } from "../utilis/fileUpload";
import { getFileIcon, getStatusColor } from "../models/dataset";

export default function DatasetsListPage() {
  // const token = useSelector((state: RootState) => state.auth.token);
  // const [publicDatasets,setPublicDatasets] = useState<DatasetMetadata[]>([]);
  // const [userDatasets, setUserDatasets] = useState<DatasetMyMetadata[]>([]);
  // const [loading, setLoading] = useState(true);
  // const [error, setError] = useState<string | null>(null);
  // const [deletingId, setDeletingId] = useState<string | null>(null);

  // const fetchDatasets = async () => {
  //   if (!token) return;
  //   try {
  //     setLoading(true);
  //     const data = await datasetService.getAllDatasets(token);
  //     setPublicDatasets(data.public);
  //     setUserDatasets(data.user);
  //   } catch (err: any) {
  //     setError("Błąd podczas pobierania zbiorów danych: " + (err.response?.data?.message || err.message));
  //   } finally {
  //     setLoading(false);
  //   }
  // };

  // useEffect(() => {
  //   fetchDatasets();
  // }, [token]);

  // const handleDelete = async (id: string, name: string) => {
  //   if (!token) return;
  //   if (!window.confirm(`Czy na pewno chcesz usunąć dataset "${name}"?`)) {
  //     return;
  //   }

  //   try {
  //     setDeletingId(id);
  //     await datasetService.deleteDataset(id, token);
  //     await fetchDatasets();
  //     alert("Dataset został usunięty pomyślnie.");
  //   } catch (err: any) {
  //     alert("Błąd podczas usuwania datasetu: " + (err.response?.data?.message || err.message));
  //   } finally {
  //     setDeletingId(null);
  //   }
  // };
  // return (
  //   <div className="p-6">
  //     <div className="flex justify-between items-center mb-6">
  //       <h2 className="text-2xl font-semibold">Zbiory danych (regresja)</h2>
  //       <Link
  //         to="/upload-regression"
  //         className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
  //       >
  //         Dodaj nowy zbiór
  //       </Link>
  //     </div>

  //     {error && (
  //       <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
  //         {error}
  //       </div>
  //     )}

  //     {loading ? (
  //       <div className="text-center py-8">
  //         <div className="text-gray-500">Ładowanie zbiorów danych...</div>
  //       </div>
  //     ) : (
  //       <div>
  //         {/* Public Datasets Section */}
  //         <div className="mb-8">
  //           <h3 className="text-xl font-semibold mb-4 text-gray-700">Publiczne zbiory danych</h3>
  //           <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
  //             {publicDatasets.map((dataset) => (
  //               <div key={dataset.id} className="border rounded-lg p-4 hover:shadow-md bg-green-50">
  //                 <h4 className="font-semibold text-lg mb-2">{dataset.name}</h4>
  //                 <div className="text-sm text-gray-600 mb-2">
  //                   <p>ID: {dataset.id}</p>
  //                   <p>Autor: {dataset.username}</p>
  //                   <p>Utworzono: {new Date(dataset.createdAt).toLocaleDateString()}</p>
  //                 </div>
  //                 <div className="text-xs text-green-600 font-medium">Publiczny</div>
  //               </div>
  //             ))}

  //             {publicDatasets.length === 0 && (
  //               <div className="col-span-full text-center py-4 text-gray-500">
  //                 Brak publicznych zbiorów danych.
  //               </div>
  //             )}
  //           </div>
  //         </div>

  //         {/* User Datasets Section */}
  //         <div className="mb-8">
  //           <h3 className="text-xl font-semibold mb-4 text-gray-700">Moje zbiory danych</h3>
  //           <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
  //             {userDatasets.map((dataset) => (
  //               <div key={dataset.id} className="border rounded-lg p-4 hover:shadow-md bg-blue-50 relative">
  //                 <h4 className="font-semibold text-lg mb-2">{dataset.name}</h4>
  //                 <div className="text-sm text-gray-600 mb-2">
  //                   <p>ID: {dataset.id}</p>
  //                   <p>Nazwa: {dataset.name}</p>
  //                   <p>Utworzono: {new Date(dataset.createdAt).toLocaleDateString()}</p>
  //                   <p>Publiczny: {dataset.IsPublic}</p>
  //                 </div>
  //                 <div className="flex justify-between items-center">
  //                   <div className="text-xs text-blue-600 font-medium">Prywatny</div>
  //                   <button
  //                     onClick={() => handleDelete(dataset.id, dataset.name)}
  //                     disabled={deletingId === dataset.id}
  //                     className={`text-xs px-3 py-1 rounded ${
  //                       deletingId === dataset.id
  //                         ? "bg-gray-300 text-gray-500 cursor-not-allowed"
  //                         : "bg-red-500 text-white hover:bg-red-600"
  //                     }`}
  //                   >
  //                     {deletingId === dataset.id ? "Usuwanie..." : "Usuń"}
  //                   </button>
  //                 </div>
  //               </div>
  //             ))}

  //             {userDatasets.length === 0 && (
  //               <div className="col-span-full text-center py-4 text-gray-500">
  //                 Brak prywatnych zbiorów danych. Dodaj pierwszy zbiór danych.
  //               </div>
  //             )}
  //           </div>
  //         </div>

  //         {/* No datasets at all */}
  //         {publicDatasets.length === 0 && userDatasets.length === 0 && (
  //           <div className="text-center py-8 text-gray-500">
  //             Brak zbiorów danych. Dodaj pierwszy zbiór danych.
  //           </div>
  //         )}
  //       </div>
  //     )}
  //   </div>
  // );

  const [dragActive, setDragActive] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);

  const handleFileUpload = (files: FileList) => {
    // Here upload to database
    simulateFileUpload(setUploading, setUploadProgress);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <HeaderDatasets />

      {/* Upload Area */}
      <div
        onDragEnter={handleDrag(setDragActive)}
        onDragLeave={handleDrag(setDragActive)}
        onDragOver={handleDrag(setDragActive)}
        onDrop={handleDrop(setDragActive, handleFileUpload)}
      >
        <UploadArea
          dragActive={dragActive}
          uploading={uploading}
          uploadProgress={uploadProgress}
          onBrowseClick={() => document.getElementById("file-input")?.click()}
          onFileSelected={(files) => handleFileUpload(files)}
        />
      </div>

      {/* Attached Datasets */}
      <AttachedDatasets
        datasets={attachedDatasets}
        getFileIcon={getFileIcon}
        getStatusColor={getStatusColor}
      />

      <Tips />
    </div>
  );
}
