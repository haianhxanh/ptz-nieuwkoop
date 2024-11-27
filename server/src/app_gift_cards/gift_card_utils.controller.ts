export const generateGiftCardCode = (): string => {
  const length = 8;
  const characters = "bcdfghjklmnpqrstvwxz0123456789";
  let code = "";

  for (let i = 0; i < length; i++) {
    const randomIndex = Math.floor(Math.random() * characters.length);
    code += characters[randomIndex];
  }
  if (code.length < length) {
    for (let i = code.length; i < length; i++) {
      const randomIndex = Math.floor(Math.random() * characters.length);
      code += characters[randomIndex];
    }
  } else if (code.length > length) {
    code = code.substring(0, length);
  }

  return code;
};
