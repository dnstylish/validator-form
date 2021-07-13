"use stric"
/**
 * Một class Validator
 * Các yêu cầu
 * Các field form item phải nằm trong form và chứa attr prop và prop phải chứa key để truy cập vào rules
 * Các field data: input, select, checkbox phải chứa valid-data
 * cấu trúc form : form > form-item[prop=*] > feild_data[valid-data]
 */
class Validator {
    /**
     * @param rules
     * Rules phải là 1 object chứa các mảng rule theo giá trị prop, key: prop
     * Selector của form
     * @param selector
     * @param error_ui?
     * @param clear_ui?
     */
    constructor(selector, rules, error_ui, clear_ui) {
        if (!rules || typeof rules !== 'object' || !selector) {
            throw new Error('Đầu vào không hợp lệ')
        }
        // query form, nếu form tồn tại thì cache lại form
        // cache lại để tối ưu hiệu suất
        this.form = document.querySelector(selector)
        if (!this.form) {
            throw new Error('Form không tồn tại')
        }
        this.rules = rules
        // custom ui lỗi action
        this._error_ui = error_ui
        this._clear_ui = clear_ui
        // gắn các rules của trigger
        this._init()
    }

    /**
     * Để gắn kết các sự kiện cho các rule có chứ trigger, onchange, focus, blur, keyup,....
     * vd: blur validate ngay khi nhấp chuột ra khỏi ô input...
     * @private
     */
    _init() {
        /**
         * For of chỉ dành do array, chuyển object thành mảng
         * Object.entries() sẽ return một mảng gồm các mảng con: [key, value]
         * [prop, rules] để lấy thành giá trị của element trong for of value: [key, value]
         */
        for (const [prop, rules] of Object.entries(this.rules)) {
            // query form item
            const field = this.form.querySelector(`[prop=${prop}]`)
            if (!field) {
                // tồn tại rule nhưng không tồn tại field trên html
                console.warn(`Rule ${prop} không được sử dụng`)
                continue
            }
            /**
             * Tìm và gắn và rule có trigger
             * forEach(value, index, array) là api của Array
             */
            rules.forEach((rule) => {
                // kiếm tra xem rule có trigger
                if (rule.trigger) {
                    // validate feild data chứa attr valid-data
                    const _selector_data = field.querySelector('[valid-data]')
                    if (!_selector_data) {
                        console.warn('Field data không xác định')
                    } else {
                        /**
                         * Validate thuỳ chỉnh
                         * rule.validate là một callback, bao gôm các params:
                         *  - tên của rule
                         *  - selector của field data
                         *  - rule
                         *  Yêu cầu trả về một giá trị đúng sai
                         */
                        if (rule.validate) {
                            this._addListener(prop, _selector_data, rule.trigger, rule.validate(prop, _selector_data, rule))
                        } else {
                            // validate của class
                            // Dựng callback cho rule
                            const callback = this._buildCallback(prop, _selector_data, rule)
                            this._addListener(prop, _selector_data, rule.trigger, callback)
                        }
                    }
                }
            })
        }
    }

    /**
     * Check roàn bộ form
     */
    validate() {
        /**
         * For of chỉ dành do array, chuyển object thành mảng
         * Object.entries() sẽ return một mảng gồm các mảng con: [key, value]
         * [prop, rules] để lấy thành giá trị của element trong for of value: [key, value]
         */
        let _errors = []
        for (const [prop, rules] of Object.entries(this.rules)) {
            // query form item
            const field = this.form.querySelector(`[prop=${prop}]`)
            if (!field) {
                // tồn tại rule nhưng không tồn tại field trên html
                console.warn(`Rule ${prop} không được sử dụng`)
                continue
            }
            /**
             * Tìm và gắn và rule có trigger
             * forEach(value, index, array) là api của Array
             */
            rules.forEach((rule) => {
                // validate feild data chứa attr valid-data
                const _selector_data = field.querySelector('[valid-data]')
                if (!_selector_data) {
                    console.warn('Field data không xác định')
                } else {
                    /**
                     * Validate thuỳ chỉnh
                     * rule.validate là một callback, bao gôm các params:
                     *  - tên của rule
                     *  - selector của field data
                     *  - rule
                     *  Yêu cầu trả về một giá trị đúng sai
                     */
                    if (rule.validate) {
                        const check = rule.validate()
                        if (!check) {
                            _errors.push(this._buildError(rule, `Trường không hợp lệ`, prop))
                        }
                    } else {
                        const _error = this._buildCallback(prop, _selector_data, rule)()
                        if (_error) {
                            _errors.push(_error)
                            this._errorUI(_error)
                        } else {
                            const _has_error = _errors.findIndex(value => value.prop === prop) > -1
                            if (!_has_error) {
                                this._clearErrorUI(prop)
                            }
                        }
                    }
                }
            })
        }
        return _errors
    }

    /**
     * Dựng callback
     * @param prop: tên rule
     * @param selector: field data
     * @param rule
     * @private
     */
    _buildCallback(prop, selector, rule) {
        return () => {
            // trả về thẻ tag của field
            // div, input, checkbox,.....
            const _tag = selector.localName
            let _value = _tag === 'input' ? this._getInputValue(selector) : selector.value
            /**
             * Bắt đầu check rule từ đâu
             * sẽ check từng yêu cầu, nếu mà có lỗi bỏ qua các lỗi còn lại...
             * Vì sai là sai...ko cần ko cần sai nhiều hay sai it...và lỗi messages chỉ có 1
             * @type {null}
             * @private
             * có fallback cho messages: nếu ko rule không messages sẽ hiển thị messages mặc định
             */
            let _error = null
            if (rule.required) {
                /**
                 * Trường được yêu cầu và không có giá trị
                 */
                if (!_value) {
                    _error = this._buildError(rule, `Trường ${prop} là bắt buộc.`, prop)
                }
            } else if (rule.enum) {
                /**
                 * Trường giá trị phải nằm trong các giá trị được yêu cầu
                 * rule.enum phải là một mảng
                 */
                if (!this._validator(_value)._enum(rule.enum)) {
                    _error = this._buildError(rule, `Trường này phải nằm trong ${rule.enum.toString()}`, prop)
                }
            } else if (rule._regex) {
                /**
                 * Kiểm tra định dạng
                 * Email của thực chất là 1 kiểu định dạng
                 * Regular Expression: https://viblo.asia/p/regular-expression-nhung-khai-niem-co-ban-jvEla4BoZkw
                 */
                if (!this._validator(_value)._regex(rule._regex)) {
                    _error = this._buildError(rule, `Trường ${prop} không đúng định dạng`, prop)
                }
            } else if (rule.min) {
                if (!this._validator(_value)._min(rule.min)) {
                    _error = this._buildError(rule, `Trường ${prop} phải lớn hơn ${rule.min}`, prop)
                }
            } else if (rule.max) {
                if (!this._validator(_value)._max(rule.max)) {
                    _error = this._buildError(rule, `Trường ${prop} phải nhỏ hơn ${rule.max}`, prop)
                }
            } else if (rule.type) {
                if (!this._validator(_value)._type(rule.type)) {
                    _error = this._buildError(rule, `Trường ${prop} cần phải là ${rule.type}`, prop)
                }
            }
            return _error
        }
    }

    /**
     * Dựng Object lỗi: Object { message: Custom messages hoặc fallback, prop }
     * @param rule
     * @param fallback
     * @param prop
     * @returns {{prop, message: string}}
     * @private
     */
    _buildError(rule, fallback, prop) {
        return {message: rule.message || fallback, prop};
    }

    /**
     * Lấy giá trị của input
     * Phải tạo hàm riêng bởi vì, những input có type: select, radio sẽ chứa nhiều input
     * Có thể chứ mảng value
     * @param selector
     * @returns {string}
     * @private
     */
    _getInputValue(selector) {
        let _value = ''
        // kiểm tra input type
        const type = selector.getAttribute('type')
        // mảng input
        if (['select', 'radio'].includes(type)) {
            /**
             * di chuyển lên parent sau đó query input:checked
             * dịch chuyển lên field-item
             * closest: tìm thằng cha gần nhất thoả mãn, nếu ko sẽ trả về null
             * Vì cấu trúc form : form > form-item[prop=*] > feild_data[valid-data]
             * nến nó sẽ trả về field chứa nó
             */
            const parent = selector.closest('[prop]')
            if (type === 'select') {
                /**
                 * nếu type=select
                 * Khởi tạo một biến _value là một mảng vì <input type="checkbox" value="*" /> trả về mảng [value]
                 * querySelectorAll query tất cả các element thoả mãn selectors cho trước => trả về một mảng các selector thoả mãn
                 * vì là mảng lên có thể sử dụng Array.forEach
                 */
                _value = []
                parent.querySelectorAll('input[type="checkbox"]:checked').forEach((input) => {
                    // thêm giá trị vào biến _value
                    _value.push(input.value)
                })
            } else {
                /**
                 * Chứa mảng input nhưng giá trị chỉ có một
                 * @type {Element}
                 * @private
                 * Kiểm tra có <input type="radio" value="*" /> đã được check hay không
                 * Nếu có sẽ lấy giá trị
                 */
                const _check = parent.querySelector('input[type="radio"]:checked')
                if (_check) {
                    _value = _check.value
                }
            }
        } else {
            /**
             * Các loại input còn lại chỉ cần lấy value
             * @private
             */
            _value = selector.value
        }
        return _value
    }

    /**
     *
     * @param value
     * @returns {{_type: (function(*): *|boolean), _max: (function(*): boolean), _enum: (function(*): *), _regex: (function(*=): *), _min: (function(*): boolean)}}
     * @private
     */
    _validator(value) {
        return {
            _enum: (list) => {
                return list.includes(value)
            },
            _regex: (pattern) => {
                return value.match(pattern)
            },
            /**
             * Với kiểu min và max
             * Áp dụng với Number và String
             * input ko trả về Number kể cả <input type="number" />
             * input text và number đều trả về String
             * Cần ép kiểu data khi so sánh
             * @param min
             * @returns {boolean}
             * @private
             */
            _min: (min) => {
                return Number(value) ? Number(value) > min : value.length > min
            },
            _max: (max) => {
                return Number(value) ? Number(value) < max : value.length < max
            },
            _type: (type) => {
                return type === 'email' ? this._validator(value)._regex('/^\\w+([\\.-]?\\w+)*@\\w+([\\.-]?\\w+)*(\\.\\w{2,3})+$/') : typeof value === type
            }
        }
    }

    /**
     * Gắn các event vào DOM
     * @param prop
     * @param selector
     * @param trigger
     * @param callback
     * @private
     * onchange, focus, blur, keyup,....
     */
    _addListener(prop, selector, trigger, callback) {
        selector.addEventListener(trigger, ()=> {
            const error = callback()
            if (error) {
                this._errorUI(error)
            } else {
                this._clearErrorUI(prop)
            }
        })
    }

    /**
     * Show lỗi lên người dùng
     * Support custom qua this._error_ui
     * @param { { message: String, prop: String } } error
     * @private
     */
    _errorUI({message, prop}) {
        if (this._error_ui) {
            this._error_ui(this.form, prop, message)
        } else {
            // tìm form-item
            const _parent = this.form.querySelector(`[prop=${prop}]`)
            // tìm element hiển thị lỗi
            let _errorNode = _parent.querySelector('.form-message')
            if (!_errorNode) {
                /**
                 * Tạo nếu chưa có element hiển thị lỗi
                 * là 1 thẻ span
                 * classList.add thêm class
                 * textContent thay đổi text
                 * .append() Chèn nội dung, di chuyển thành phần vào trong thành phần khác, nội dung này thường được sắp xếp ở vị trí sau cùng.
                 * @type {HTMLSpanElement}
                 * @private
                 */
                _errorNode = document.createElement('span')
                _errorNode.classList.add('form-message')
                _errorNode.textContent = message
                _parent.append(_errorNode)
            } else {
                _errorNode.textContent = message
            }
        _parent.classList.add('invalid')
        }
    }

    /**
     * Xoá giao diện lỗi nếu có
     * Check nếu custom _clear_ui sẽ gọi _clear_ui() thay thế
     * @param { String } prop
     * @returns {*}
     * @private
     */
    _clearErrorUI(prop) {
        if (this._clear_ui) {
            return this._clear_ui(this.form, prop)
        }
        const _parent = this.form.querySelector(`[prop=${prop}]`)
        // check parent đã từng bị lỗi hay chưa bằng cách check class
        if (_parent.classList.contains('invalid')) {
            // xoá element
            _parent.querySelector('.form-message').remove()
            // xoá class invalid
            _parent.classList.remove('invalid')
        }
    }
}

/**
 * Gắn global class Valudator để có thể truy trực tiếp
 * @type {Validator}
 */
window.Validator = Validator
