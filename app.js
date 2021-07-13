/**
 * callback sẽ chạy khi document đã load xong: sự kiện: DOMContentLoaded
 * @param callback
 */
const ready = callback => {
    if (document.readyState !== 'loading') callback()
    else document.addEventListener('DOMContentLoaded', callback)
};

const rules = {
    name: [
        {
            required: true,
            message: 'Tên không được để trống',
            trigger: 'blur'
        },
        {
            max: 10,
            message: 'Tên quá dài',
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
    ]
}

ready(() => {
    /**
     * Khỏi tạo đổi tượng Validator
     * Và các params tương ứng
     * @type {Validator}
     */
    const validator = new Validator('#form-1', rules)

    document.querySelector('#form-1').addEventListener('submit', (e) => {
        e.preventDefault()
        const errors = validator.validate()
        if (errors.length) {
            return console.log('Form lỗi')
        }
        // làm dưới đó dưới này...call api,...vì form đúng
    })
})
