import assert from "node:assert/strict";
import {
  getCpfCnpjValidationMessage,
  isValidCnpj,
  isValidCpf,
  normalizeCpfCnpjDigits,
} from "../src/lib/cpf-cnpj";

function mustThrow(fn: () => unknown) {
  let threw = false;
  try {
    fn();
  } catch {
    threw = true;
  }
  assert.equal(threw, true);
}

assert.equal(isValidCpf("529.982.247-25"), true);
assert.equal(normalizeCpfCnpjDigits("52998224725"), "52998224725");

assert.equal(isValidCnpj("11.222.333/0001-81"), true);
assert.equal(normalizeCpfCnpjDigits("11222333000181"), "11222333000181");

assert.equal(getCpfCnpjValidationMessage("529.982.247-24"), "CPF invalido. Confira os digitos verificadores.");
assert.equal(getCpfCnpjValidationMessage("11.222.333/0001-82"), "CNPJ invalido. Confira os digitos verificadores.");

assert.match(getCpfCnpjValidationMessage("000.000.000-00") ?? "", /Sequencias repetidas/);
assert.match(getCpfCnpjValidationMessage("00.000.000/0000-00") ?? "", /Sequencias repetidas/);

mustThrow(() => normalizeCpfCnpjDigits("529.982.<script>-25"));
mustThrow(() => normalizeCpfCnpjDigits("abc52998224725"));

console.log("cpf-cnpj-validation tests passed");
