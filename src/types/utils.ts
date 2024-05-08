export type JSONSerializable =
  | JSONSerializablePrimitive
  | JSONSerializableArray
  | JSONSerializableObject;

export type JSONSerializablePrimitive = null | boolean | string | number;

export type JSONSerializableObject = Partial<{ [key: string]: JSONSerializable }>;

export interface JSONSerializableArray extends Array<JSONSerializable> {}
