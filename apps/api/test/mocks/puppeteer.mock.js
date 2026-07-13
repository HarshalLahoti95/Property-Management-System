module.exports = {
  launch: jest.fn().mockResolvedValue({
    newPage: jest.fn().mockResolvedValue({
      setContent: jest.fn().mockResolvedValue(true),
      pdf: jest.fn().mockImplementation(() => Promise.resolve(Buffer.from(`mock pdf content ${Date.now()} ${Math.random()}`))),
      close: jest.fn().mockResolvedValue(true),
    }),
    close: jest.fn().mockResolvedValue(true),
  }),
};
