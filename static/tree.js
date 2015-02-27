var render_rows = function(rows, root, cur_lvl) {
    var row,
        tmpl,
        parent = root,
        diff = 0;
    rows.reverse(); // для использование .pop() в цикле while
    root.children('div').remove();

    while (rows.length !== 0) { // построение иерархии вложенных блоков <div>
        row = rows.pop();
        tmpl = row['is_ancestor'] ? '<div class="l' + row['lvl'] + '" id="' + row['code'] + '">' +
                                  '<span class="is_ancestor">' + row['name'] + ' L' + row['lvl'] + '</span>'
                                  : '<div class="l' + row['lvl'] + '" id="' + row['code'] + '">' +
                                   row['name'] + ' L' + row['lvl'];
        tmpl += ' <button class="edit">edit</button>' +
                ' <button class="delete">delete</button>' +
                '</div>';

        if (row['lvl'] < cur_lvl) {
            diff = cur_lvl - row['lvl'];
            cur_lvl = row['lvl'];
            parent = $(parent.parents().get(diff));
            parent.append(tmpl);
            parent = parent.children('div').last();
        }

        else if (row['lvl'] == cur_lvl) {
            parent.parent().append(tmpl);
        }

        else if (row['lvl'] > cur_lvl) {
            cur_lvl = row['lvl'];
            parent.append(tmpl);
            parent = parent.children('div').last();
        }
    }
};

//var collapse = function() {
//    var span = $(this),
//        div = span.parent();
//
//    div.children('div').remove();
//    span.one('click', expand);
//};

var show_descendants = function() { //TODO: добавить сворачивание
    var span = $(this),
        div = span.parent(),
        cur_lvl = div.attr('class').substr(1),
        code = div.attr('id');

    if (code && cur_lvl) {
        $.get('http://127.0.0.1:8888/manage?' + $.param({code: code}))
            .fail(function (jqxhr, status, error) {
                alert(error);
            })
            .done(function (data, status, jqxhr) {
                if (data['rows'])
                    render_rows(data['rows'], div, cur_lvl);
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
                if (data['success'])
                    div.html(div.html().replace(name, new_name));
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
            .done(function (data, status, jqxhr) {
                if (data['success'])
                    div.remove();
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
                    if (data['rows'])
                        render_rows(data['rows'], root, 0);
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
                if (data['rows'])
                    render_rows(data['rows'], root, 0);
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
