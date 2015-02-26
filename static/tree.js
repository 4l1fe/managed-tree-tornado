var render_rows = function(rows, root, cur_lvl) {
    var row,
        ancestors_count = 0;
    rows.reverse();
    root.children('div').remove();

    while (rows.length !== 0) { // избыточно, т.к. приходит только один уровень ниже?
        row = rows.pop();

        if (row['lvl'] < cur_lvl) {
            ancestors_count -= 1;
            for (var i=0; i < cur_lvl-row['lvl']; i++) {
                root.append('</div>');
            }
            cur_lvl = row['lvl']
        }

        else if (row['lvl'] == cur_lvl) {
            root.append('</div>');
        }

        else if (row['lvl'] > cur_lvl) {
            cur_lvl = row['lvl'];
            ancestors_count += 1;
        }

        var tmpl = row['is_ancestor'] ? '<div class="l' + row['lvl'] + '" id="' + row['code'] + '">' +
                                      '<span class="is_ancestor">' + row['name'] + ' L' + row['lvl'] + '</span>'
                                    : '<div class="l' + row['lvl'] + '" id="' + row['code'] + '">' +
                                      row['name'] + ' L' + row['lvl'];
        tmpl += ' <button class="edit">edit</button>' +
                ' <button class="delete">delete</button>';
        root.append(tmpl);
    }

    for (var i=0; i < ancestors_count; i++) {
        root.append('</div>')
    }
};

var show_descendants = function() {
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
                if (data['rows']) {
                    render_rows(data['rows'], div, cur_lvl);
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
                if (data['success']) {
                    div.remove();
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
                        render_rows(data['rows'], root, 0);
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
                    render_rows(data['rows'], root, 0);
                };
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
