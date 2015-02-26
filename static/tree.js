var render_rows = function(rows, root, empty) {
    root.children('div').remove();
    $.each(rows, function (k, v) { //'.' в id ломает поиск по селектору

        var tmpl = v['is_ancestor'] ? '<div class="l' + v['lvl'] + '" id="' + v['code'] + '">' +
                                      '<span class="is_ancestor">' + v['name'] + ' L' + v['lvl'] + '</span>'
                                    : '<div class="l' + v['lvl'] + '" id="' + v['code'] + '">' +
                                      v['name'] + ' L' + v['lvl'];
        tmpl += ' <button class="edit">edit</button>' +
                ' <button class="delete">delete</button>' +
                '</div>';
        root.append(tmpl);
    });
};

var show_descendants = function() {
    var span = $(this),
        div = span.parent(),
        code = div.attr('id');

    if (code) {
        $.get('http://127.0.0.1:8888/manage?' + $.param({code: code}))
            .fail(function (jqxhr, status, error) {
                alert(error);
            })
            .done(function (data, status, jqxhr) {
                if (data['rows']) {
                    render_rows(data['rows'], div);
                };
            });
    };
};

var edit = function() {
    var div = $(this).parent(),
        code = div.attr('id'),
        text = div.is(':has(span)') ? div.children('span').text()
                                    : div.text(),
        name = text.split(/ L[0-9]+/)[0],
        new_name = prompt('Новое имя:', name);

    if (new_name) {
        $.post('http://127.0.0.1:8888/manage', {code: code, name: name, new_name: new_name})
            .fail(function (jqxhr, status, error) {
                alert(error);
            })
            .done(function (data, status, jqxhr) {
                if (data['success']) {
                    div.html(div.html().replace(name, new_name));
                }
            });
    };
};

var del = function() {
    var div = $(this).parent(),
        code = div.attr('id');

    if (code) {
        $.ajax({
            type: 'DELETE',
            url: 'http://127.0.0.1:8888/manage?' + $.param({code: code})
        })
            .fail(function (jqxhr, status, error) {
                alert(error);
            })
            .done(function (data, status, jqxhr) { //TODO: можно упростить, удаляя вёртску потомков
                if (data['rows']) {
                    $.each(data['rows'], function (index, value) {
                        $('#' + value).empty();
                    });
                }
                ;
            });
    };
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
                    if (data['rows']) {
                        render_rows(data['rows'], root);
                    };
                });
        };
    };
};

var load_data = function() {
    var lvl = $(this).val();
    if (lvl) {
        $.post('http://127.0.0.1:8888/', {lvl: lvl})
            .fail(function (jqxhr, status, error) {
                alert(error);
            })
            .done(function (data, status, jqxhr) {
                var root = $('#root');
                if (data['rows']) {
                    render_rows(data['rows'], root);
                }
                ;
            });
    };
};

$(function() { // регистрация после рендеринга
    $(document).on('change', 'select', load_data)
               .on('keypress', 'input', search)
               .on('click', '.edit', edit)
               .on('click', '.delete', del)
               .on('click', '.is_ancestor', show_descendants);
});