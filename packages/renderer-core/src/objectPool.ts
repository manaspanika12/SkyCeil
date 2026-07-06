export class ObjectPool<T> {
  private readonly available: T[] = [];

  constructor(
    private readonly createItem: () => T,
    private readonly resetItem: (item: T) => void,
  ) {}

  acquire(): T {
    return this.available.pop() ?? this.createItem();
  }

  release(item: T): void {
    this.resetItem(item);
    this.available.push(item);
  }

  get size(): number {
    return this.available.length;
  }
}
