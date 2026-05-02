import { Controller } from "@hotwired/stimulus"

export default class extends Controller {
  static targets = ["input", "totalOutput", "submitButton", "validationMessage"]

  static values = {
    targetTotal: { type: Number, default: 100000 },
    unitScale: { type: Number, default: 100 },
    minUnit: { type: Number, default: -1000 },
    maxUnit: { type: Number, default: 1000 }
  }

  connect() {
    this.hasInteracted = false
    this.update()
  }

  onInput(event) {
    this.hasInteracted = true
    const input = event.target
    input.dataset.manual = "true"
    if (input.dataset.auto === "true") delete input.dataset.auto
    this.update()
  }

  get targetUnits() {
    return this.targetTotalValue / this.unitScaleValue
  }

  parseValue(value) {
    if (value == null) return null
    const trimmed = value.trim()
    if (trimmed === "") return null
    const number = Number(trimmed)
    if (!Number.isFinite(number)) return null
    return Math.trunc(number)
  }

  sumUnits(skipInput = null) {
    return this.inputTargets.reduce((sum, input) => {
      if (input === skipInput) return sum
      const value = this.parseValue(input.value)
      return value == null ? sum : sum + value
    }, 0)
  }

  countFilled(skipInput = null) {
    return this.inputTargets.filter(
      (input) => input !== skipInput && this.parseValue(input.value) != null
    ).length
  }

  update() {
    const inputs = this.inputTargets
    const autoInput = inputs.find((input) => input.dataset.auto === "true")
    let targetInput = null

    if (autoInput && this.countFilled(autoInput) === inputs.length - 1) {
      targetInput = autoInput
    } else if (!autoInput && this.countFilled() === inputs.length - 1) {
      const emptyInput = inputs.find((input) => this.parseValue(input.value) == null)
      if (emptyInput && emptyInput.dataset.manual !== "true") {
        targetInput = emptyInput
      }
    }

    if (targetInput) {
      const remaining = this.targetUnits - this.sumUnits(targetInput)
      targetInput.value = String(remaining)
      targetInput.dataset.auto = "true"
      delete targetInput.dataset.manual
    } else if (autoInput && autoInput.dataset.manual !== "true") {
      autoInput.value = ""
      delete autoInput.dataset.auto
    }

    const totalUnits = this.sumUnits()
    this.totalOutputTarget.textContent = String(totalUnits * this.unitScaleValue)

    if (this.hasSubmitButtonTarget) {
      const allFilled = inputs.every((input) => this.parseValue(input.value) != null)
      const inRange = inputs.every((input) => {
        const value = this.parseValue(input.value)
        return value == null || (value >= this.minUnitValue && value <= this.maxUnitValue)
      })
      const isValid = allFilled && totalUnits === this.targetUnits && inRange
      this.submitButtonTarget.disabled = !isValid
      this.submitButtonTarget.classList.toggle("is-disabled", !isValid)
      if (this.hasValidationMessageTarget) {
        this.validationMessageTarget.hidden = isValid || !this.hasInteracted
      }
    }
  }
}
