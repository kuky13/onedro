export const convertToCSV = (objArray: any[]) => {
  const array = typeof objArray !== 'object' ? JSON.parse(objArray) : objArray;
  if (array.length === 0) return '';

  const str =
    `${Object.keys(array[0]).map((value) => `"${value}"`).join(',')}` + '\r\n';

  return array.reduce((str: string, next: any) => {
    str +=
      `${Object.values(next)
        .map((value) => `"${value}"`)
        .join(',')}` + '\r\n';
    return str;
  }, str);
};

export const downloadFile = (content: string, fileName: string, contentType: string) => {
  const a = document.createElement('a');
  const file = new Blob([content], { type: contentType });
  a.href = URL.createObjectURL(file);
  a.download = fileName;
  a.click();
  URL.revokeObjectURL(a.href);
};
