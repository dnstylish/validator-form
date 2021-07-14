/**
 * callback sẽ chạy khi document đã load xong: sự kiện: DOMContentLoaded
 * @param callback
 */
const ready = callback => {
    if (document.readyState !== 'loading') callback()
    else document.addEventListener('DOMContentLoaded', callback)
};

/**
 * Rules sẽ là 1 mảng [prop: rules]
 * trong đó prop là tên của rules
 * rule trong rules thì cái option như sau: min, max, required, enum, type, message, validate
 * required: Trường bắt buộc
 * enum: Trường thuộc danh sách cho trước
 * type: Kiểu dữ liệu
 * message: Thông báo lỗi
 * validate: Funtion <> Custom validate
 * @type {{password: [{message: string, required: boolean}], repassword: [{trigger: string, message: string, validate: (function(*, *): function(): boolean)}], name: [{trigger: string, message: string, required: boolean}, {max: number, message: string}], email: [{trigger: string, message: string, required: boolean}, {type: string, message: string}]}}
 */
const rules = {
    name: [
        {
            required: true,
            message: 'Tên không được để trống',
            trigger: 'blur'
        },
        {
            min: 3,
            message: 'Tên quá ngắn',
            trigger: 'blur'
        }
    ],
    email: [
        {
            required: true,
            message: 'Email không được để trống',
            trigger: 'blur'
        },
        {
            type: 'email',
            message: 'Email không hợp lệ',
            trigger: 'blur'
        }
    ],
    sex: [
        {
            enum: ['1', '2'],
            message: 'Giới tính phải là nam hoặc nữ',
            trigger: 'blur'
        }
    ],
    password: [
        {
            required: true,
            message: 'Mật khẩu không được để trống',
            trigger: 'blur'
        }
    ],
    repassword: [
        {
            required: true,
            message: 'Mật khẩu lại không được để trống',
            trigger: 'blur'
        },
        {
            trigger: 'blur',
            message: 'Mật khẩu nhập lại không chính xác',
            /**
             * Tuỳ chỉnh validte
             * @param form: đối tượng form
             * @param selector: field data hiện tại
             * @returns {(function(): boolean)|*}
             */
            validate: function (form, selector) {
                return () => {
                    const password = form.querySelector(`[prop="password"] input`).value
                    if (!password) {
                        // chưa nhập password
                        return true
                    }
                    return password === selector.value
                }
            }
        }
    ]
}

ready(() => {
    /**
     * Khỏi tạo đổi tượng Validator
     * Và các params tương ứng
     * @type {Validator}
     */
    const validator = new Validator('#form-1', rules)

    /**
     * VD validate thủ công
     * B1: Gắn sự kiện submit vào form
     * B2: e.preventDefault(), hành động submit mặc định của form sẽ là 1 POST request
     * trang sẽ bị reload cho nên chúng ta sẽ sử dụng e.preventDefault() ngừng sự kiện reload khi bấm submit
     * => ngăn trang ko load lại
     */
    document.querySelector('#form-1').addEventListener('submit', (e) => {
        e.preventDefault()
        /**
         * Gọi method validate từ đối tượng Validator
         * Method này sẽ trả về 1 mảng lỗi
         * => nếu mảng rỗng, sẽ ko có lỗi xảy ra
         * @type {[]}
         */
        const errors = validator.validate()
        if (errors.length) {
            // return console.log('Form lỗi')
        }
        // làm dưới đó dưới này...call api,...vì form đúng
    })


    /**
     * show code, ko thuyết trình phần này
     */
    document.querySelectorAll('.tab-panel > button').forEach((element) => {
        element.addEventListener('click', ()=> {
            if (!element.classList.contains('active')) {
                const tab = element.getAttribute('for-tab')
                document.querySelectorAll('.gist-item').forEach((e2) => {
                    if (e2.getAttribute('tab') === tab) {
                        e2.classList.add('show')
                    } else {
                        e2.classList.remove('show')
                    }
                })
            }
            document.querySelectorAll('.tab-panel > button').forEach((button)=> {
                if (button.contains(element)) {
                    button.classList.add('active')
                } else {
                    button.classList.remove('active')
                }
            })
        })
    })
})
