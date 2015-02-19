var edit = function() {
    var div = $(this).parent(),
        code = div.attr('id'), name = div.text().replace(/ L[0-9].*/, ''),
        new_name = prompt('Новое имя:', name);

    $.post('http://127.0.0.1:8888/manage', {code: code, name: name, new_name: new_name})
        .fail(function (jqxhr, status, error) {
            alert(error);
        })
        .done(function (data, status, jqxhr) {
            if (data['success']) {
                div.attr('name', new_name).text(new_name); // удаляет кнопки!!!
            }
        });
};

var del = function() {
    var div = $(this).parent(),
        code = div.attr('id'), name = div.text().replace(/ L[0-9].*/, '');

    $.ajax({url: 'http://127.0.0.1:8888/manage?' + $.param({code: code, name: name}),
            type: 'DELETE'})
    .fail(function(jqxhr, status, error) {
        alert(error);
    })
    .done(function(data, status, jqxhr) {
        if (data['success']) {
            div.remove();
        }
    });
};

var search = function(event) {
    if(event.which == 13) {
        var searched_text = $(this).val();
        if (searched_text) {
            $.get('http://127.0.0.1:8888/search?' + $.param({searched_text: searched_text}))
                .fail(function(jqxhr, status, error) {
                    alert(error);
                })
                .done(function(data, status, jqxhr) {
                    var root = $('#root');
                    root.empty();
                    if (data['rows']) {
                        $.each(data['rows'], function (k, v) { //'.' в id ломает поиск по селектору
                        root.append('<div class="l' + v['lvl'] + '" id="' + v['code'] + '">' + v['name'] + ' L' + v['lvl'] +
                        '<button class="edit">edit</button>' +
                        '<button class="delete">delete</button>' +
                        '</div>');
                    });
                    //root.text().replace(/.*.*/g, '<span') // подсветка
                    $('button.edit').on('click', edit);
                    $('button.delete').on('click', del);
                    }
                });
        };
    }
};

var load_data = function() {
    $.post('http://127.0.0.1:8888/', {lvl: $(this).val()})
        .fail(function(jqxhr, status, error) {
            alert(error);
        })
        .done(function(data, status, jqxhr) {
            var root = $('#root');
            root.empty();
            if (data['rows']) {
                $.each(data['rows'], function (k, v) { //'.' в id ломает поиск по селектору
                    root.append('<div class="l' + v['lvl'] + '" id="' + v['code'] + '">' + v['name'] + ' L' + v['lvl'] +
                    '<button class="edit">edit</button>' +
                    '<button class="delete">delete</button>' +
                    '</div>');
                });
                $('button.edit').on('click', edit);
                $('button.delete').on('click', del);
            };
        });
};

$(function() { // регистрация при рендеринге
    $('select').on('change', load_data);
    $('input').on('keypress', search);
    $('button.edit').on('click', edit);
    $('button.delete').on('click', del);
});