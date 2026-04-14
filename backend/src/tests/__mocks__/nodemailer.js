const mockSendMail = jest.fn().mockResolvedValue({});

module.exports = {
    createTransport: jest.fn(() => ({ sendMail: mockSendMail })),
    createTestAccount: jest.fn().mockResolvedValue({
        user: 'test@ethereal.email',
        pass: 'test-password',
        smtp: {
            host: 'smtp.ethereal.email',
            port: 587,
            secure: false,
        },
    }),
    getTestMessageUrl: jest.fn().mockReturnValue('preview-url'),
    __mockSendMail: mockSendMail,
};