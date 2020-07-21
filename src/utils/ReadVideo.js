const ReadVideo = async (fileInput) => {
    const readAsDataURL = (fileInput) => {
      return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onerror = () => {
          reader.abort();
          reject(new Error("Error reading file."));
        };
        reader.addEventListener("load", () => {
          
          resolve(reader.result);
        }, false);
        reader.readAsDataURL(fileInput);
      });
    };      
    const valid = await isFileVideo(fileInput)
    console.log(valid)
    if(valid){
      return readAsDataURL(fileInput)
    }else{
      return null
    }
}

const isFileVideo = (file) => {
  return file && file['type'].split('/')[0] === 'video';
}

export default ReadVideo