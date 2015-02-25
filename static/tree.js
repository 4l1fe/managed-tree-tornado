var edit = function() {
    var div = $(this).parent(),
        code = div.attr('id'),
        name = div.text().split(/ L[0-9]+/)[0],
        new_name = prompt('Новое имя:', name);

    $.post('http://127.0.0.1:8888/manage', {code: code, name: name, new_name: new_name})
        .fail(function (jqxhr, status, error) {
            alert(error);
        })
        .done(function (data, status, jqxhr) {
            if (data['success']) {
                div.html(div.html().replace(name, new_name));  // из-за переписывания сносятся обработчики
                div.children('.edit').on('click', edit);
                div.children('.delete').on('click', del);
            }
        });
};

var del = function() {
    var div = $(this).parent(),
        code = div.attr('id');

    $.ajax({type: 'DELETE',
            url: 'http://127.0.0.1:8888/manage?' + $.param({code: code})})
    .fail(function(jqxhr, status, error) {
        alert(error);
    })
    .done(function(data, status, jqxhr) {
        if (data['rows']) {
            $.each(data['rows'], function(index, value) {
                $('#'+value).remove();
            });
        };
    });
};

var search = function(event) {
    if(event.which == 13) {
        var searched_text = $(this).val().trim();
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
                            var is_ancestor = v['is_ancestor'] ? ' is_ancestor' : ''
                            root.append('<div class="l' + v['lvl'] + is_ancestor + '" id="' + v['code'] + '">' + v['name'] + ' L' + v['lvl'] +
                            '<button class="edit">edit</button>' +
                            '<button class="delete">delete</button>' +
                            '</div>');
                        });
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
                    var is_ancestor = v['is_ancestor'] ? ' is_ancestor' : ''
                    root.append('<div class="l' + v['lvl'] + is_ancestor +'" id="' + v['code'] + '">' + v['name'] + ' L' + v['lvl'] +
                    '<button class="edit">edit</button>' +
                    '<button class="delete">delete</button>' +
                    '</div>');
                });
                $('button.edit').on('click', edit);
                $('button.delete').on('click', del);
            };
        });
};

$(function() { // регистрация после рендеринга
    $('select').on('change', load_data);
    $('input').on('keypress', search);
    $('button.edit').on('click', edit);
    $('button.delete').on('click', del);
});