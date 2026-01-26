// Global type declarations for Jest
declare global {
  function describe(description: string, fn: () => void): void;
  function it(description: string, fn: () => void | Promise<void>): void;
  function beforeAll(fn: () => void | Promise<void>): void;
  function afterAll(fn: () => void | Promise<void>): void;
  function beforeEach(fn: () => void | Promise<void>): void;
  function afterEach(fn: () => void | Promise<void>): void;
  
  namespace jest {
    function fn(): any;
    function clearAllMocks(): void;
    function spyOn(object: any, method: string): any;
  }
  
  const expect: any;
}

export {};