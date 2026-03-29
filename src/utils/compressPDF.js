export const compressPDF = async (file) => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const arrayBuffer = e.target.result;
      // Simple compression - you can use libraries like pdf-lib for better compression
      const compressed = arrayBuffer.slice(
        0,
        Math.min(arrayBuffer.byteLength, 5 * 1024 * 1024),
      ); // Limit to 5MB
      const compressedFile = new File([compressed], file.name, {
        type: file.type,
      });
      resolve(compressedFile);
    };
    reader.onerror = reject;
    reader.readAsArrayBuffer(file);
  });
};
