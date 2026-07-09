const mockRequestUse = jest.fn();
const mockResponseUse = jest.fn();

const mockApiInstance = {
  interceptors: {
    request: { use: mockRequestUse },
    response: { use: mockResponseUse },
  },
  get: jest.fn(),
  post: jest.fn(),
  patch: jest.fn(),
  delete: jest.fn(),
};

jest.mock("axios", () => ({
  __esModule: true,
  default: {
    create: jest.fn(() => mockApiInstance),
  },
}));

jest.mock("@react-native-async-storage/async-storage", () => ({
  __esModule: true,
  default: {
    getItem: jest.fn(),
    removeItem: jest.fn(),
    setItem: jest.fn(),
  },
}));

const AsyncStorage =
  require("@react-native-async-storage/async-storage").default;
const {
  clearAuthTokenCache,
  getAuthToken,
  resetAuthTokenCache,
  setAuthTokenCache,
} = require("../api");

const requestInterceptor = mockRequestUse.mock.calls[0][0];
const responseErrorInterceptor = mockResponseUse.mock.calls[0][1];

describe("api token cache", () => {
  beforeEach(() => {
    resetAuthTokenCache();
    AsyncStorage.getItem.mockReset();
    AsyncStorage.removeItem.mockReset();
    AsyncStorage.setItem.mockReset();
  });

  it("reads token from AsyncStorage when memory cache is empty", async () => {
    AsyncStorage.getItem.mockResolvedValue("stored-token");

    await expect(getAuthToken()).resolves.toBe("stored-token");
    await expect(getAuthToken()).resolves.toBe("stored-token");

    expect(AsyncStorage.getItem).toHaveBeenCalledTimes(1);
    expect(AsyncStorage.getItem).toHaveBeenCalledWith("token");
  });

  it("uses memory cache without reading AsyncStorage repeatedly", async () => {
    setAuthTokenCache("memory-token");

    await expect(getAuthToken()).resolves.toBe("memory-token");
    const config = await requestInterceptor({ headers: {} });

    expect(config.headers.Authorization).toBe("Bearer memory-token");
    expect(AsyncStorage.getItem).not.toHaveBeenCalled();
  });

  it("does not override explicit authorization headers", async () => {
    setAuthTokenCache("memory-token");

    const config = await requestInterceptor({
      headers: { Authorization: "Bearer explicit-token" },
    });

    expect(config.headers.Authorization).toBe("Bearer explicit-token");
    expect(AsyncStorage.getItem).not.toHaveBeenCalled();
  });

  it("clears cached token for logout-style cleanup", async () => {
    setAuthTokenCache("memory-token");
    clearAuthTokenCache();

    const config = await requestInterceptor({ headers: {} });

    expect(config.headers.Authorization).toBeUndefined();
    expect(AsyncStorage.getItem).not.toHaveBeenCalled();
  });

  it("clears token cache and storage on 401 responses", async () => {
    const error = { response: { status: 401 }, config: {} };
    setAuthTokenCache("memory-token");
    AsyncStorage.removeItem.mockResolvedValue();

    await expect(responseErrorInterceptor(error)).rejects.toBe(error);

    expect(AsyncStorage.removeItem).toHaveBeenCalledWith("token");
    expect(AsyncStorage.removeItem).toHaveBeenCalledWith("user");

    const config = await requestInterceptor({ headers: {} });
    expect(config.headers.Authorization).toBeUndefined();
    expect(AsyncStorage.getItem).not.toHaveBeenCalled();
  });
});
