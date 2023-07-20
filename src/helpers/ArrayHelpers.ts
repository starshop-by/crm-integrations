export const sleep = (n: number) => new Promise((res) => setTimeout(res, n));

export const asyncEvery = async (arr: any, predicate: any) => {
  for (const e of arr) {
    if (!(await predicate(e))) return false;
  }
  return true;
}