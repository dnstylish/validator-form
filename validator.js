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
     * error_ui phải là 1 function: custom thông báo lỗi
     * clear_ui phải là 1 funtion: custom xoá thông báo lỗi
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
            rules.forEach((rule, index) => {
                // gán index cho rule
                rule.index = index
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
                            this._addListener(prop, _selector_data, rule, this._runCustomValidate(rule.validate, _selector_data, rule, prop))
                        } else {
                            // nếu ko có custom validate
                            // Dựng callback cho rule
                            const callback = this._buildCallback(prop, _selector_data, rule)
                            this._addListener(prop, _selector_data, rule, callback)
                        }
                    }
                }
            })
        }
    }

    /**
     * Check roàn bộ form
     * Trả về một mảng có chứa các lỗi
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
             * forEach(value, index, array) là api của Array
             * Xử lý với toàn bộ rule
             */
            rules.forEach((rule, index) => {
                // gán index cho rule
                rule.index = index
                // validate feild data chứa attr valid-data
                const _selector_data = field.querySelector('[valid-data]')
                if (!_selector_data) {
                    // feild không tồn tại
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
                        const _error = this._runCustomValidate(rule.validate, _selector_data, rule, prop)()
                        if (_error) {
                            _errors.push(_error)
                            this._errorUI(_error, index)
                        } else {
                            this._clearErrorUI(prop, index)
                        }
                    } else {
                        const _error = this._buildCallback(prop, _selector_data, rule)()
                        if (_error) {
                            _errors.push(_error)
                            this._errorUI(_error, index)
                        } else {
                            /**
                             * Kiểm tra xem đã có ở field đó hay chứ...VD: password có 2 lỗi
                             * vì _errors là một mảng lên có thể sử dụng Array.findIndex:
                             * Tìm index của element đầu tiên thoả mãn điều kiện
                             * Vì index của mảng bắt đầu từ 0 nên nếu ko thoả mãn index sẽ = -1
                             * @type {boolean}
                             * @private
                             */
                            this._clearErrorUI(prop, index)
                        }
                    }
                }
            })
        }
        return _errors
    }

    /**
     * Chạy custom validate tại đây
     * Nếu custom validate trả về đúng tức là dữ liệu sẽ trả bề void
     * Nếu sai sẽ trả về 1 lỗi theo đúng format
     * @param callback
     * @param selector
     * @param rule
     * @param prop
     * @returns {(function(): ({prop, message: string}|undefined))|*}
     * @private
     */
    _runCustomValidate(callback, selector, rule, prop) {
        return () => {
            if (!callback(this.form, selector, rule )()) {
                return this._buildError(rule, `Trường ${prop} không hợp lệ`, prop)
            }
        }
    }

    /**
     * Dựng callback
     * @param prop: tên rule
     * @param selector: field data
     * @param  rule
     * @private
     */
    _buildCallback(prop, selector, rule) {
        return () => {
            // trả về thẻ tag của field
            // div, input, checkbox,.....
            const _tag = selector.localName
            let _value = null
            switch (_tag) {
                case 'input':
                    _value = this._getInputValue(selector)
                    break
                case 'select':
                    if (selector.querySelectorAll('option').length) {
                        _value = selector.options[selector.selectedIndex].value
                    }
                    break
                default:
                    _value = selector.value

            }
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
            }
            if (_value) {
                if (rule.enum) {
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
        // tạo biến để hứng giá trị value
        let _value = ''
        // kiểm tra input type
        const type = selector.getAttribute('type')
        // mảng input
        if (['radio', 'checkbox'].includes(type)) {
            /**
             * di chuyển lên parent sau đó query input:checked
             * dịch chuyển lên field-item
             * closest: tìm thằng cha gần nhất thoả mãn, nếu ko sẽ trả về null
             * Vì cấu trúc form : form > form-item[prop=*] > feild_data[valid-data]
             * nến nó sẽ trả về field chứa nó
             */
            const parent = selector.closest('[prop]')
            if (type === 'checkbox') {
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
            /**
             * cái regex này là dùng để test định dạng của dữ liệu
             * Regular Expression
             * Link: https://viblo.asia/p/regular-expression-nhung-khai-niem-co-ban-jvEla4BoZkw
             * @param pattern
             * @returns {boolean}
             * @private
             */
            _regex: (pattern) => {
                return new RegExp(pattern).test(value)
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
            /**
             * Kiểu dữ liệu cần validate
             * @param type
             * @returns {*|boolean}
             * @private
             */
            _type: (type) => {
                return type === 'email' ? this._validator(value)._regex('^[\\w-\\/.]+@([\\w-]+\\.)+[\\w-]{2,4}$') : typeof value === type
            }
        }
    }

    /**
     * Gắn các event vào DOM
     * @param prop
     * @param selector
     * @param { { trigger: String, index: Number } } rule
     * @param callback
     * @private
     * onchange, focus, blur, keyup,....
     * addEventListener thêm lắng kiện vào DOM param của nó đầu tiên là tên sự kiện, 2 callback,...
     */
    _addListener(prop, selector, {trigger, index}, callback) {
        selector.addEventListener(trigger, ()=> {
            // call callback để lấy lỗi
            const error = callback()
            if (error) {
                // show lỗi trên giao diện
                this._errorUI(error, index)
            } else {
                // xoá lỗi
                this._clearErrorUI(prop, index)
            }
        })
    }

    /**
     * Show lỗi lên người dùng
     * Support custom qua this._error_ui
     * @param { { message: String, prop: String } } error
     * @param { Number } index
     * @private
     */
    _errorUI({message, prop}, index) {
        // call nếu có truyền vào 1 callback custom show lỗi
        if (this._error_ui) {
            this._error_ui(this.form, prop, message)()
        } else {
            // tìm form-item chưa field data hiện tại
            const _parent = this.form.querySelector(`[prop=${prop}]`)
            // tìm element hiển thị lỗi
            let _errorNode = _parent.querySelector(`.form-message[rule-index="${index}"]`)
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
                _errorNode.setAttribute('rule-index', index.toString())
                _errorNode.textContent = message
                _parent.append(_errorNode)
            }
        _parent.classList.add('invalid')
        }
    }

    /**
     * Xoá giao diện lỗi nếu có
     * Check nếu custom _clear_ui sẽ gọi _clear_ui() thay thế
     * @param { String } prop
     * @param { Number } index
     * @returns {*}
     * @private
     */
    _clearErrorUI(prop, index) {
        if (this._clear_ui) {
            return this._clear_ui(this.form, prop)()
        }
        // tim form-item chứa nó
        const _parent = this.form.querySelector(`[prop=${prop}]`)
        // check parent đã từng bị lỗi hay chưa bằng cách check class
        if (_parent.classList.contains('invalid')) {
            // xoá element
            _parent.querySelector(`.form-message[rule-index="${index}"]`)?.remove()
            // xoá class invalid
            if (!_parent.querySelectorAll(`.form-message`).length) {
                _parent.classList.remove('invalid')
            }
        }
    }
}

/**
 * Gắn global class Valudator để có thể truy trực tiếp
 * @type {Validator}
 */
window.Validator = Validator
